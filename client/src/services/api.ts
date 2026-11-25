import axios from 'axios';
import { SystemMetric, MinecraftStatus, OllacraftStatus, BackupsStatusResponse, BackupLogResponse } from '@/types';

let API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Automatically detect backend port based on client port in dev environment
if (typeof window !== 'undefined' && !API_URL) {
  const port = window.location.port;
  
  if (port === '3001') {
    API_URL = 'http://localhost:8001';
  } else if (port === '3000') {
    API_URL = 'http://localhost:8000';
  } else {
    API_URL = window.location.origin;
  }
}

const api = axios.create({
  baseURL: API_URL,
});

export const metricsService = {
  getLatest: async (): Promise<SystemMetric> => {
    const response = await api.get<SystemMetric>('/api/metrics/latest');
    return response.data;
  },
  getHistory: async (limit: number = 100): Promise<SystemMetric[]> => {
    const response = await api.get<SystemMetric[]>('/api/metrics', { params: { limit } });
    return response.data;
  },
  getDevices: async (): Promise<string[]> => {
    try {
      const response = await api.get<string[]>('/api/devices');
      return response.data;
    } catch (e) {
      return ["host-machine"];
    }
  },
  getMinecraftStatus: async (): Promise<MinecraftStatus> => {
    const response = await api.get<MinecraftStatus>('/api/minecraft');
    return response.data;
  },
  getOllacraftStatus: async (): Promise<OllacraftStatus> => {
    const response = await api.get<OllacraftStatus>('/api/ollacraft');
    return response.data;
  },
};

export const backupsService = {
  getStatus: async (): Promise<BackupsStatusResponse> => {
    const response = await api.get<BackupsStatusResponse>('/api/backups');
    return response.data;
  },
  getHistory: async (): Promise<BackupLogResponse[]> => {
    const response = await api.get<BackupLogResponse[]>('/api/backups/history');
    return response.data;
  },
  runBackup: async (service: string, apiKey: string): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>(
      '/api/backups/run',
      { service },
      { headers: { 'X-API-Key': apiKey } }
    );
    return response.data;
  },
};
