import axios from 'axios';

/**
 * Resolves the backend base URL for the SAC Agent from environment variables.
 */
const getBaseUrl = () => {
  if (import.meta.env.VITE_SAC_AGENT_API_URL) {
    return import.meta.env.VITE_SAC_AGENT_API_URL;
  }
  return import.meta.env.DEV ? 'http://localhost:8000' : '';
};

/**
 * Initiates the streaming SSE connection to profile models and get recommendations.
 * @param {Array<{spaceId: string, modelId: string}>} models
 * @returns {Promise<Response>}
 */
export const recommendCharts = async (models) => {
  const payloadModels = models
    .filter(m => m.spaceId && m.modelId)
    .map(m => ({
      space_id: m.spaceId.trim().replace(/\s+/g, '_'),
      model_id: m.modelId.trim().replace(/\s+/g, '_')
    }));

  return fetch(`${getBaseUrl()}/api/sac/recommend-charts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ models: payloadModels })
  });
};

/**
 * Generates the declarative SAC story and publishes to SAP Analytics Cloud.
 * @param {string} spaceId
 * @param {string} modelId
 * @param {Array<object>} selectedRecommendations
 * @param {object} availableMetadata
 * @returns {Promise<object>}
 */
export const generateStory = async (spaceId, modelId, selectedRecommendations, availableMetadata) => {
  const response = await axios.post(`${getBaseUrl()}/api/sac/generate-story`, {
    space_id: spaceId || 'default-space',
    model_id: modelId || 'default-model',
    selected_recommendations: selectedRecommendations,
    available_metadata: availableMetadata
  });
  return response.data;
};
