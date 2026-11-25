from copy import deepcopy


DEFAULT_SITE_CONTENT = {
    'church_name': 'WIS Sunyani',
    'tagline': 'Faith. Community. Service.',
    'location': 'Sunyani, Bono Region, Ghana',
    'logo_url': '',
    'hero_title': 'A community rooted in faith and growing together.',
    'hero_body': 'Join us for worship, fellowship, and service as we care for our community and grow together.',
    'hero_image_url': '',
    'history': (
        'Wesleyan International Society, Sunyani is a community of faith serving '
        'the Bono Region through worship, fellowship, and outreach.'
    ),
    'statement_of_faith': '',
    'announcements': [],
    'programs': [],
    'shop_url': '',
    'shop_intro': '',
    'shop_items': [],
    'address': 'Sunyani, Bono Region, Ghana',
    'contact_email': '',
    'contact_phone': '',
    'facebook_url': '',
    'youtube_url': '',
    'primary_color': '#24106a',
    'accent_color': '#f3c316',
}


def default_site_content():
    return deepcopy(DEFAULT_SITE_CONTENT)
