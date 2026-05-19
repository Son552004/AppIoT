import { C } from '../constants/theme';

export const getHeartRateColor = (hr) => {
  if (hr === 0) return C.textMuted;
  if (hr < 60 || hr > 100) return C.danger;
  if (hr < 65 || hr > 90)  return C.warn;
  return C.safe;
};

export const getSpo2Color = (sp) => {
  if (sp === 0) return C.textMuted;
  if (sp < 90) return C.danger;
  if (sp < 95) return C.warn;
  return C.safe;
};

export const getDrowsinessColor = (s) => {
  if (s === 'Buồn ngủ') return C.danger;
  if (s === 'Tỉnh táo' || s === 'Đang nhận dữ liệu...')  return C.safe;
  return C.textMuted;
};

export const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
