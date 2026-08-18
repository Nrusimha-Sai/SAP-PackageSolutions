/* ================================================================
   Datasphere Agent – API Service
   All backend calls centralised here.
   Base URL is read from the VITE_DS_AGENT_API_URL env variable.
================================================================ */

import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_DS_AGENT_API_URL) {
    return import.meta.env.VITE_DS_AGENT_API_URL;
  }
  return import.meta.env.DEV ? 'http://localhost:8000/api/ds' : '/api/ds';
};

/**
 * Upload one or more JSON files to the agent backend.
 * @param {File[]} files
 * @returns {Promise<{graph: {nodes: Array, edges: Array}}>}
 */
export const uploadFiles = async (files) => {
  const formData = new FormData();
  const list = Array.isArray(files) ? files : [files];
  list.forEach((f) => formData.append('files', f));

  const response = await axios.post(`${getBaseUrl()}/upload`, formData, {
    timeout: 60000,
  });
  return response.data;
};

/**
 * Send a natural-language instruction to the agent.
 * @param {string} instruction
 * @returns {Promise<{graph: {nodes: Array, edges: Array}}>}
 */
export const sendInstruction = async (instruction) => {
  const response = await axios.post(
    `${getBaseUrl()}/instruct`,
    { instruction },
    { timeout: 30000 },
  );
  return response.data;
};

/** Undo last action. */
export const undo = async () => {
  const response = await axios.post(`${getBaseUrl()}/undo`, {}, { timeout: 10000 });
  return response.data;
};

/** Redo last undone action. */
export const redo = async () => {
  const response = await axios.post(`${getBaseUrl()}/redo`, {}, { timeout: 10000 });
  return response.data;
};

/** Export the current JSON state (for download). */
export const exportJson = async () => {
  const response = await axios.get(`${getBaseUrl()}/export?t=${Date.now()}`);
  return response.data;
};

/** Get the full state (original + current JSON) for preview. */
export const getState = async () => {
  const response = await axios.get(`${getBaseUrl()}/state?t=${Date.now()}`, {
    timeout: 10000,
  });
  return response.data;
};
