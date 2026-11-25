import apiClient from './apiClient';

export const churchSiteApi = {
  async getPublicSite() {
    const response = await apiClient.get('/site/public/');
    return response.data;
  },

  async getEditorContent() {
    const response = await apiClient.get('/site/editor/');
    return response.data;
  },

  async saveDraft(content) {
    const response = await apiClient.put('/site/editor/', content);
    return response.data;
  },

  async publish() {
    const response = await apiClient.post('/site/editor/publish/');
    return response.data;
  },
};
