import csv
import io

from rest_framework.exceptions import ValidationError

from .serializers import MemberImportSerializer

MEMBER_CSV_FIELDS = [
    'member_id',
    'full_name',
    'date_of_birth',
    'sex',
    'phone',
    'email',
    'place_of_residence',
    'profession',
    'department',
    'class_name',
    'committee',
    'marital_status',
    'is_visitor',
    'baptised',
    'confirmed',
]
MAX_MEMBER_IMPORT_BYTES = 5 * 1024 * 1024
MAX_MEMBER_IMPORT_ROWS = 1000


def _parse_boolean(value, field_name):
    if value == '':
        return False
    normalized = value.strip().lower()
    if normalized in {'true', 'yes', '1'}:
        return True
    if normalized in {'false', 'no', '0'}:
        return False
    raise ValueError(f'{field_name} must be true/false, yes/no, or 1/0.')


def parse_member_csv(upload):
    if upload.size > MAX_MEMBER_IMPORT_BYTES:
        raise ValidationError(
            {'file': [f'CSV files must be no larger than {MAX_MEMBER_IMPORT_BYTES // (1024 * 1024)} MB.']}
        )

    try:
        content = upload.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))
        fieldnames = [name.strip().lower() for name in (reader.fieldnames or [])]
    except (UnicodeDecodeError, csv.Error) as exc:
        raise ValidationError({'file': ['The file must be a valid UTF-8 CSV.']}) from exc

    if not fieldnames or len(set(fieldnames)) != len(fieldnames):
        raise ValidationError({'file': ['The CSV must contain a unique header row.']})
    if 'full_name' not in fieldnames:
        raise ValidationError({'file': ['The CSV must include a full_name column.']})
    unknown = sorted(set(fieldnames) - set(MEMBER_CSV_FIELDS))
    if unknown:
        raise ValidationError({
            'file': [f'Unsupported CSV columns: {", ".join(unknown)}.']
        })

    rows = []
    invalid_rows = []
    seen_member_ids = set()
    seen_emails = set()

    for line_number, raw_row in enumerate(reader, start=2):
        if line_number - 1 > MAX_MEMBER_IMPORT_ROWS:
            raise ValidationError({
                'file': [f'CSV files may contain at most {MAX_MEMBER_IMPORT_ROWS} member rows.']
            })
        if None in raw_row:
            invalid_rows.append({
                'row': line_number,
                'errors': {'row': ['The row contains more values than the header.']},
            })
            continue

        data = {
            key.strip().lower(): (value or '').strip()
            for key, value in raw_row.items()
            if key is not None
        }
        if not any(data.values()):
            continue

        try:
            for field_name in ('is_visitor', 'baptised', 'confirmed'):
                if field_name in data:
                    data[field_name] = _parse_boolean(data[field_name], field_name)
        except ValueError as exc:
            invalid_rows.append({
                'row': line_number,
                'errors': {'boolean': [str(exc)]},
            })
            continue

        serializer = MemberImportSerializer(data=data)
        if not serializer.is_valid():
            invalid_rows.append({'row': line_number, 'errors': serializer.errors})
            continue

        validated = serializer.validated_data
        member_id = validated.get('member_id')
        email = validated.get('email')
        is_visitor = validated.get('is_visitor', False)
        row_errors = {}
        if member_id and member_id in seen_member_ids:
            row_errors['member_id'] = ['This member ID is duplicated in the CSV.']
        if email and not is_visitor and email in seen_emails:
            row_errors['email'] = ['This email is duplicated in the CSV.']
        if row_errors:
            invalid_rows.append({'row': line_number, 'errors': row_errors})
            continue

        if member_id:
            seen_member_ids.add(member_id)
        if email and not is_visitor:
            seen_emails.add(email)
        rows.append(validated)

    return {
        'row_count': len(rows) + len(invalid_rows),
        'valid_rows': rows,
        'invalid_rows': invalid_rows,
    }
