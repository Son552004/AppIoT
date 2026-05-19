import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, Animated, Platform, useWindowDimensions
} from 'react-native';
import { Svg, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { C } from '../constants/theme';
import { PulseRing } from '../components/SharedComponents';

// ─── Design tokens (Fusion Engine dark) ─────────────────────────────────────
const D = {
  bg:        '#080808',
  surface:   '#0d0d0d',
  surface2:  '#111111',
  border:    '#1e1e1e',
  border2:   '#2a2a2a',
  textPri:   '#e5e5e5',
  textSec:   '#888888',
  textMuted: '#444444',
  mono:      Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  safe:      '#22c55e',
  safeBg:    '#052e16',
  safeBorder:'#16a34a',
  warn:      '#f59e0b',
  warnBg:    '#1c1400',
  warnBorder:'#d97706',
  danger:    '#ef4444',
  dangerBg:  '#1a0000',
  dangerBorder:'#dc2626',
  danger:    '#ef4444',
  dangerBg:  '#1a0000',
  dangerBorder:'#dc2626',
  info:      '#60a5fa',
};

// ─── State config ─────────────────────────────────────────────────────────────
function getStateConfig(isDrowsy) {
  if (isDrowsy) {
    return { color: D.warn, bg: D.warnBg, border: D.warnBorder, label: 'BUỒN NGỦ' };
  }
  return { color: D.safe, bg: D.safeBg, border: D.safeBorder, label: 'TỈNH TÁO' };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Monospace metric block — mirrors Gauge from Fusion Engine */
function FusionGauge({ label, value, unit, color, subtext, barPct = 0 }) {
  const displayColor = color || D.textSec;
  return (
    <View style={fu.gaugeCard}>
      <Text style={fu.gaugeLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 2 }}>
        <Text style={[fu.gaugeValue, { color: displayColor }]}>
          {value != null && value > 0 ? (typeof value === 'number' ? (value > 10 ? Math.round(value) : value.toFixed(1)) : value) : '--'}
        </Text>
        <Text style={fu.gaugeUnit}>{unit}</Text>
      </View>
      {/* Progress bar */}
      <View style={fu.gaugeTrack}>
        <View style={[fu.gaugeFill, { width: `${Math.min(100, barPct)}%`, backgroundColor: displayColor }]} />
      </View>
      {!!subtext && <Text style={[fu.gaugeSub, { color: displayColor }]}>{subtext}</Text>}
    </View>
  );
}

/** AI confidence score bar */
function AiScoreBar({ label, value = 0, color, sublabel }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 10, color: D.textMuted, letterSpacing: 1.5, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 12, color, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), fontWeight: '700' }}>
          {Math.round(pct)}%
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
      {!!sublabel && (
        <Text style={{ fontSize: 10, color, marginTop: 4, fontWeight: '600' }}>{sublabel}</Text>
      )}
    </View>
  );
}

/** Combined dual-line chart with LIVE indicator — driven by realtimeBuffer */
function CombinedChart({ realtimeBuffer = [], isLive }) {
  const { width: screenWidth } = useWindowDimensions();
  const W     = screenWidth - 36 - 28;
  const H     = 140;
  const PAD_L = 32;
  const PAD_R = 32;
  const PAD_T = 6;
  const PAD_B = 22;
  const IW    = W - PAD_L - PAD_R;
  const IH    = H - PAD_T - PAD_B;

  // Blink anim for LIVE dot
  const liveDot = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isLive) { liveDot.setValue(0.3); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDot, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(liveDot, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isLive]);

  // Map buffer → SVG points, fixed domain per series
  function toPoints(data, domainMin, domainMax) {
    if (!data || data.length < 2) return '';
    return data.map((v, i) => {
      const x    = PAD_L + (i / (data.length - 1)) * IW;
      const norm = Math.min(1, Math.max(0, (v - domainMin) / (domainMax - domainMin)));
      const y    = PAD_T + (1 - norm) * IH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  const hrArr   = realtimeBuffer.map(p => p.hr);
  const spo2Arr = realtimeBuffer.map(p => p.spo2);
  const hrPts   = toPoints(hrArr,   30,  160);
  const spo2Pts = toPoints(spo2Arr, 80,  100);

  // X-axis: show time label every ~15 points
  const xTicks = realtimeBuffer.length > 1
    ? [0, Math.floor((realtimeBuffer.length - 1) / 2), realtimeBuffer.length - 1]
    : [];

  const latestHr   = hrArr.length   > 0 ? hrArr[hrArr.length - 1]     : null;
  const latestSpo2 = spo2Arr.length > 0 ? spo2Arr[spo2Arr.length - 1] : null;
  const gridYs     = [0, 0.33, 0.66, 1].map(t => PAD_T + t * IH);

  return (
    <View>
      {/* ── Panel header ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        {/* Legend */}
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 20, height: 2, backgroundColor: D.info,    borderRadius: 1 }} />
            <Text style={{ fontSize: 11, color: D.textSec }}>Nhịp tim</Text>
            {latestHr != null && (
              <Text style={{ fontSize: 11, color: D.info, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), fontWeight: '600' }}>
                {Math.round(latestHr)}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 20, height: 2, backgroundColor: D.safe, borderRadius: 1 }} />
            <Text style={{ fontSize: 11, color: D.textSec }}>SpO2</Text>
            {latestSpo2 != null && (
              <Text style={{ fontSize: 11, color: D.safe, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), fontWeight: '600' }}>
                {Math.round(latestSpo2)}%
              </Text>
            )}
          </View>
        </View>

        {/* LIVE badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Animated.View style={{
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: isLive ? D.safe : D.textMuted,
            opacity: liveDot,
          }} />
          <Text style={{
            fontSize: 10, fontWeight: '700', letterSpacing: 2,
            color: isLive ? D.safe : D.textMuted,
          }}>
            {isLive ? 'LIVE' : 'PAUSED'}
          </Text>
        </View>
      </View>

      {/* ── SVG chart ── */}
      <Svg width={W} height={H}>
        {/* Grid lines */}
        {gridYs.map((y, i) => (
          <Line key={i}
            x1={PAD_L} y1={y} x2={PAD_L + IW} y2={y}
            stroke="#1a1a1a" strokeWidth="1"
          />
        ))}

        {/* Vertical edge lines */}
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + IH} stroke="#222" strokeWidth="0.5" />

        {/* HR line */}
        {hrPts !== '' && (
          <Polyline
            points={hrPts} fill="none"
            stroke={D.info} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* SpO2 line */}
        {spo2Pts !== '' && (
          <Polyline
            points={spo2Pts} fill="none"
            stroke={D.safe} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Y-axis left: BPM */}
        <SvgText x={PAD_L - 4} y={PAD_T + 6}      fill={D.info} fontSize="9" textAnchor="end">160</SvgText>
        <SvgText x={PAD_L - 4} y={PAD_T + IH / 2} fill={D.info} fontSize="9" textAnchor="end">90</SvgText>
        <SvgText x={PAD_L - 4} y={PAD_T + IH}     fill={D.info} fontSize="9" textAnchor="end">30</SvgText>

        {/* Y-axis right: SpO2 */}
        <SvgText x={PAD_L + IW + 4} y={PAD_T + 6}      fill={D.safe} fontSize="9" textAnchor="start">100</SvgText>
        <SvgText x={PAD_L + IW + 4} y={PAD_T + IH / 2} fill={D.safe} fontSize="9" textAnchor="start">90</SvgText>
        <SvgText x={PAD_L + IW + 4} y={PAD_T + IH}     fill={D.safe} fontSize="9" textAnchor="start">80</SvgText>

        {/* X-axis labels */}
        {xTicks.map(i => (
          <SvgText
            key={i}
            x={PAD_L + (i / Math.max(1, realtimeBuffer.length - 1)) * IW}
            y={H - 4}
            fill="#444" fontSize="9" textAnchor="middle"
          >
            {realtimeBuffer[i]?.label || ''}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

/** Section header */
function SectionHeader({ title }) {
  return <Text style={fu.sectionHeader}>{title}</Text>;
}

// ─── Main screen ─────────────────────────────────────────────────────────────
const DashboardScreen = ({
  userFullName, status,
  heartRate, spo2,
  deviceActive, historyData, lastHistorySync,
  getHeartRateColor, getSpo2Color, getDrowsinessColor,
  isDrowsy, alertAnim, connectionStatus,
  aiDrowsy = 0,    // 0–1 float từ AI model (buồn ngủ)
  aiAlert  = 1,    // 0–1 float từ AI model (tỉnh táo)
}) => {
  // Blink animation for alert state
  const blinkAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isDrowsy) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, { toValue: 0.25, duration: 600, useNativeDriver: true }),
          Animated.timing(blinkAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      blinkAnim.setValue(1);
    }
  }, [isDrowsy]);

  // ── Realtime rolling buffer (last 60 readings) ──
  const [realtimeBuffer, setRealtimeBuffer] = useState([]);
  useEffect(() => {
    if (!heartRate && !spo2) return;
    const now = new Date();
    const label = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setRealtimeBuffer(prev => [
      ...prev,
      { hr: Number(heartRate) || 0, spo2: Number(spo2) || 0, ts: now.getTime(), label }
    ].slice(-60)); // keep last 60 points
  }, [heartRate, spo2]);

  const syncText = lastHistorySync
    ? new Date(lastHistorySync).toLocaleTimeString('vi-VN')
    : 'Chưa đồng bộ';

  // ── Derived values ──
  const stateCfg = getStateConfig(isDrowsy);
  const isOnline = !connectionStatus?.includes('Lỗi') && !connectionStatus?.includes('Mất');
  const hrPct    = heartRate > 0 ? Math.min(100, ((heartRate - 30) / 130) * 100) : 0;
  const spo2Pct  = spo2 > 0      ? Math.min(100, ((spo2 - 80) / 20) * 100)       : 0;

  const drowsyLabel = aiDrowsy >= 0.7 ? 'Cao — cần dừng xe'
    : aiDrowsy >= 0.4 ? 'Trung bình — chú ý'
    : 'Thấp — ổn định';
  const alertLabel  = aiAlert  >= 0.7 ? 'Tốt — tỉnh táo'
    : aiAlert  >= 0.4 ? 'Trung bình'
    : 'Thấp — mệt mỏi';

  return (
    <View style={fu.root}>
      {/* ── Alert banner ── */}
      {isDrowsy && (
        <View style={fu.alertBanner}>
          <Text style={fu.alertBannerIcon}>⚠</Text>
          <Text style={fu.alertBannerText}>PHÁT HIỆN BUỒN NGỦ — HÃY DỪNG XE NGHỈ NGƠI</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={fu.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ── */}
        <View style={fu.topBar}>
          <View>
            <Text style={fu.topBarSub}>Vehicle Safety Monitor</Text>
            <Text style={fu.topBarName}>{userFullName || 'Tài xế'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[fu.dot, { backgroundColor: isOnline ? D.safe : D.danger }]} />
              <Text style={[fu.dotLabel, { color: isOnline ? D.safe : D.danger }]}>
                {isOnline ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>
            <Text style={fu.syncText}>Cập nhật {syncText}</Text>
          </View>
        </View>

        {/* ── Main status card ── */}
        <View style={[fu.statusCard, { backgroundColor: stateCfg.bg, borderColor: stateCfg.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={fu.statusCardLabel}>TRẠNG THÁI HIỆN TẠI</Text>
            <Animated.Text style={[fu.statusCardValue, { color: stateCfg.color, opacity: isDrowsy ? blinkAnim : 1 }]}>
              {stateCfg.label}
            </Animated.Text>
            <Text style={[fu.statusCardSub, { color: stateCfg.color }]}>
              {deviceActive ? '● Thiết bị hoạt động' : '○ Thiết bị không hoạt động'}
            </Text>
          </View>
          <View style={fu.pulseWrap}>
            <PulseRing active={isDrowsy} color={stateCfg.color} />
            <Text style={fu.statusEmoji}>{isDrowsy ? '😴' : '👁'}</Text>
          </View>
        </View>

        {/* ── Gauges row ── */}
        <SectionHeader title="DỮ LIỆU CẢM BIẾN" />
        <View style={fu.gaugesRow}>
          <FusionGauge
            label="NHỊP TIM"
            value={heartRate}
            unit="bpm"
            color={getHeartRateColor ? getHeartRateColor(heartRate) : (heartRate < 60 || heartRate > 100 ? D.warn : D.safe)}
            subtext={heartRate > 0 ? (heartRate < 60 || heartRate > 100 ? 'Bất thường' : 'Ổn định') : ''}
            barPct={hrPct}
          />
          <FusionGauge
            label="SPO2"
            value={spo2}
            unit="%"
            color={getSpo2Color ? getSpo2Color(spo2) : (spo2 < 95 ? D.danger : D.safe)}
            subtext={spo2 > 0 ? (spo2 < 95 ? 'Thấp' : 'Tốt') : ''}
            barPct={spo2Pct}
          />
        </View>

        {/* ── AI Analysis panel ── */}
        <SectionHeader title="PHÂN TÍCH AI" />
        <View style={fu.panel}>
          {/* State badge row */}
          <View style={fu.aiStateRow}>
            <View style={[fu.aiStateBadge, {
              backgroundColor: isDrowsy ? D.warnBg : D.safeBg,
              borderColor:     isDrowsy ? D.warnBorder : D.safeBorder,
            }]}>
              <Text style={[fu.aiStateBadgeText, { color: isDrowsy ? D.warn : D.safe }]}>
                {isDrowsy ? '😴  BUỒN NGỦ' : '👁  TỈNH TÁO'}
              </Text>
            </View>
            <Text style={fu.aiTimestamp}>
              {new Date().toLocaleTimeString('vi-VN')}
            </Text>
          </View>

          <View style={fu.divider} />

          {/* Score bars */}
          <View style={{ gap: 14 }}>
            <AiScoreBar
              label="BUỒN NGỦ"
              value={aiDrowsy}
              color={aiDrowsy >= 0.4 ? D.warn : D.textMuted}
              sublabel={drowsyLabel}
            />
            <AiScoreBar
              label="TỈNH TÁO"
              value={aiAlert}
              color={D.safe}
              sublabel={alertLabel}
            />
          </View>
        </View>

        {/* ── Realtime chart ── */}
        <SectionHeader title="THỜI GIAN THỰC" />
        <View style={fu.panel}>
          <CombinedChart
            realtimeBuffer={realtimeBuffer}
            isLive={isOnline && deviceActive}
          />
        </View>

        {/* ── Footer ── */}
        <Text style={fu.footer}>Fusion Engine · MAX30100 + AI</Text>

      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const fu = StyleSheet.create({
  root:             { flex: 1, backgroundColor: D.bg },
  scroll:           { padding: 18, paddingBottom: 110 },

  // Alert banner
  alertBanner:      { backgroundColor: '#3b0000', borderBottomWidth: 1, borderBottomColor: D.dangerBorder, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 99 },
  alertBannerIcon:  { fontSize: 16, color: D.danger },
  alertBannerText:  { color: '#fca5a5', fontWeight: '700', fontSize: 12, flex: 1, letterSpacing: 0.8 },

  // Top bar
  topBar:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  topBarSub:        { fontSize: 10, color: D.textMuted, letterSpacing: 2.5, textTransform: 'uppercase' },
  topBarName:       { fontSize: 20, color: D.textPri, fontWeight: '700', marginTop: 2 },
  dot:              { width: 7, height: 7, borderRadius: 4 },
  dotLabel:         { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  syncText:         { fontSize: 10, color: D.textMuted },

  // Status card
  statusCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 18, marginBottom: 22 },
  statusCardLabel:  { fontSize: 10, color: D.textMuted, letterSpacing: 2.5, fontWeight: '600' },
  statusCardValue:  { fontSize: 26, fontWeight: '800', marginTop: 4, letterSpacing: 1.5 },
  statusCardSub:    { fontSize: 11, marginTop: 6, fontWeight: '600' },
  pulseWrap:        { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  statusEmoji:      { fontSize: 30, position: 'absolute' },

  // Section header
  sectionHeader:    { fontSize: 10, color: D.textMuted, letterSpacing: 2.5, fontWeight: '600', marginBottom: 10, marginTop: 4 },

  // Gauges
  gaugesRow:        { flexDirection: 'row', gap: 10, marginBottom: 22 },
  gaugeCard:        { flex: 1, backgroundColor: D.surface2, borderWidth: 1, borderColor: D.border, borderRadius: 10, padding: 12 },
  gaugeLabel:       { fontSize: 10, color: D.textMuted, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase' },
  gaugeValue:       { fontSize: 30, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), fontWeight: '700', lineHeight: 34 },
  gaugeUnit:        { fontSize: 11, color: D.textMuted, marginBottom: 4 },
  gaugeTrack:       { height: 3, backgroundColor: '#1a1a1a', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  gaugeFill:        { height: '100%', borderRadius: 2 },
  gaugeSub:         { fontSize: 10, fontWeight: '600', marginTop: 5 },

  // Panel
  panel:            { backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, borderRadius: 12, padding: 14, marginBottom: 4 },
  divider:          { height: 1, backgroundColor: D.border, marginVertical: 8 },

  // AI panel
  aiStateRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aiStateBadge:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  aiStateBadgeText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  aiTimestamp:      { fontSize: 10, color: D.textMuted, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },

  // Footer
  footer:           { textAlign: 'center', fontSize: 10, color: D.textMuted, letterSpacing: 1.5, marginTop: 24 },
});

export default DashboardScreen;