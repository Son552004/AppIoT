import React from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  Switch, ActivityIndicator, Dimensions, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Design tokens (Fusion Engine dark) ──────────────────────────────────────
const D = {
  bg:           '#080808',
  surface:      '#0d0d0d',
  surface2:     '#111111',
  border:       '#1e1e1e',
  border2:      '#2a2a2a',
  textPri:      '#e5e5e5',
  textSec:      '#888888',
  textMuted:    '#444444',
  mono:         Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
  safe:         '#22c55e',
  safeBg:       '#052e16',
  safeBorder:   '#16a34a',
  warn:         '#f59e0b',
  warnBg:       '#1c1400',
  warnBorder:   '#d97706',
  danger:       '#ef4444',
  dangerBg:     '#1a0000',
  dangerBorder: '#dc2626',
  info:         '#60a5fa',
};

const SW = Dimensions.get('window').width;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function Panel({ children, style }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

/** Monospace stat block identical to FusionGauge */
function StatBlock({ label, value, unit, color }) {
  return (
    <View style={s.statBlock}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>
        {value || '—'}
      </Text>
      <Text style={s.statUnit}>{unit}</Text>
      <View style={s.statTrack}>
        <View style={[s.statFill, { backgroundColor: color, width: value ? '70%' : '0%' }]} />
      </View>
    </View>
  );
}

/** Single history row */
function HistoryRow({ item }) {
  const isDrowsy = item.isDrowsy;
  const bpm  = Number(item.bpm)  || 0;
  const spo2 = Number(item.spo2) || 0;
  const bpmColor  = bpm  < 60 || bpm  > 100 ? D.warn : D.safe;
  const spo2Color = spo2 < 95              ? D.danger : D.safe;

  return (
    <View style={[s.historyRow, isDrowsy && { borderLeftColor: D.warn, borderLeftWidth: 2 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.historyTs}>
          {new Date(item.timestamp).toLocaleString('vi-VN')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={[s.historyVal, { color: bpmColor, fontFamily: D.mono }]}>
            {bpm} <Text style={s.historyUnit}>bpm</Text>
          </Text>
          <Text style={{ color: D.border2 }}>·</Text>
          <Text style={[s.historyVal, { color: spo2Color, fontFamily: D.mono }]}>
            {spo2}<Text style={s.historyUnit}>%</Text>
          </Text>
        </View>
      </View>
      <View style={[s.stateBadge, { borderColor: isDrowsy ? D.warnBorder : D.border2, backgroundColor: isDrowsy ? D.warnBg : 'transparent' }]}>
        <Text style={{ fontSize: 10, color: isDrowsy ? D.warn : D.textMuted, fontWeight: '700', letterSpacing: 1 }}>
          {isDrowsy ? 'DROWSY' : 'OK'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
const DataManagerScreen = ({
  deviceActive, handleDeviceToggle,
  startDate, endDate,
  showStartDatePicker, setShowStartDatePicker,
  showEndDatePicker,   setShowEndDatePicker,
  handleStartDateChange, handleEndDateChange,
  deleteDataInRange, deletingData,
  allHistory, fetchFullHistory, historyLoading, lastHistorySync,
  loadMoreHistory, historyLoadingMore, historyHasMore,
}) => {
  const syncText    = lastHistorySync
    ? new Date(lastHistorySync).toLocaleTimeString('vi-VN')
    : 'Chưa đồng bộ';
  const totalCount  = allHistory.length;
  const averageHr   = totalCount > 0
    ? Math.round(allHistory.reduce((sum, d) => sum + (Number(d.bpm)  || 0), 0) / totalCount)
    : 0;
  const averageSpo2 = totalCount > 0
    ? Math.round(allHistory.reduce((sum, d) => sum + (Number(d.spo2) || 0), 0) / totalCount)
    : 0;

  // ── Header ──
  const HeaderComponent = () => (
    <View style={{ paddingTop: 20 }}>
      {/* Page title */}
      <View style={s.topBar}>
        <View>
          <Text style={s.topBarSub}>Vehicle Safety Monitor</Text>
          <Text style={s.topBarTitle}>Dữ liệu & Thống kê</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={s.syncLine}>Cập nhật {syncText}</Text>
          <Text style={s.totalCount}>{totalCount} bản ghi</Text>
        </View>
      </View>

      {/* ── Stats ── */}
      <SectionHeader title="CHỈ SỐ TRUNG BÌNH" />
      <Panel>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatBlock label="NHỊP TIM" value={averageHr}   unit="bpm" color={D.info}  />
          <StatBlock label="SPO2"     value={averageSpo2} unit="%"   color={D.safe}  />
        </View>
      </Panel>

      {/* ── Device control ── */}
      <SectionHeader title="TRẠNG THÁI THIẾT BỊ" />
      <Panel>
        <View style={s.deviceRow}>
          <View>
            <Text style={s.deviceLabel}>MAX30100 Sensor</Text>
            <Text style={[s.deviceStatus, { color: deviceActive ? D.safe : D.textMuted }]}>
              {deviceActive ? '● Hoạt động' : '○ Ngủ đông'}
            </Text>
          </View>
          <Switch
            value={deviceActive}
            onValueChange={handleDeviceToggle}
            trackColor={{ false: '#1a1a1a', true: D.safeBg }}
            thumbColor={deviceActive ? D.safe : '#333'}
          />
        </View>
        <Text style={s.hint}>Tắt để tiết kiệm pin — đèn LED và cảm biến sẽ dừng hoạt động.</Text>
      </Panel>

      {/* ── Delete range ── */}
      <SectionHeader title="XÓA DỮ LIỆU THEO KHOẢNG NGÀY" />
      <Panel>
        <TouchableOpacity style={s.dateBtn} onPress={() => setShowStartDatePicker(true)}>
          <Text style={s.dateBtnLabel}>TỪ NGÀY</Text>
          <Text style={s.dateBtnValue}>{startDate.toLocaleDateString('vi-VN')}</Text>
        </TouchableOpacity>
        {showStartDatePicker && (
          <DateTimePicker value={startDate} mode="date" display="default" onChange={handleStartDateChange} />
        )}

        <View style={s.dateDivider} />

        <TouchableOpacity style={s.dateBtn} onPress={() => setShowEndDatePicker(true)}>
          <Text style={s.dateBtnLabel}>ĐẾN NGÀY</Text>
          <Text style={s.dateBtnValue}>{endDate.toLocaleDateString('vi-VN')}</Text>
        </TouchableOpacity>
        {showEndDatePicker && (
          <DateTimePicker value={endDate} mode="date" display="default" onChange={handleEndDateChange} />
        )}

        <TouchableOpacity
          style={[s.deleteBtn, deletingData && { opacity: 0.4 }]}
          onPress={deleteDataInRange}
          disabled={deletingData}
          activeOpacity={0.7}
        >
          {deletingData
            ? <ActivityIndicator color={D.danger} size="small" />
            : <Text style={s.deleteBtnText}>XÓA DỮ LIỆU</Text>}
        </TouchableOpacity>
      </Panel>

      {/* ── History header ── */}
      <View style={s.historyHeaderRow}>
        <View>
          <SectionHeader title={`LỊCH SỬ ĐO  (${allHistory.length})`} />
        </View>
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => fetchFullHistory(true)}
          disabled={historyLoading}
          activeOpacity={0.7}
        >
          {historyLoading
            ? <ActivityIndicator size="small" color={D.info} />
            : <Text style={s.refreshBtnText}>Làm mới</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Footer ──
  const FooterComponent = () => (
    historyHasMore && historyLoadingMore ? (
      <View style={s.footerRow}>
        <ActivityIndicator size="small" color={D.textMuted} />
        <Text style={s.footerText}>Đang tải thêm...</Text>
      </View>
    ) : !historyHasMore && allHistory.length > 0 ? (
      <Text style={s.footerEnd}>─── Kết thúc lịch sử ───</Text>
    ) : null
  );

  // ── Empty ──
  const EmptyComponent = () => (
    !historyLoading ? (
      <View style={s.emptyWrap}>
        <Text style={s.emptyText}>Chưa có dữ liệu trong khoảng thời gian này.</Text>
      </View>
    ) : null
  );

  if (historyLoading && allHistory.length === 0) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={D.info} />
        <Text style={s.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <FlatList
        data={allHistory}
        renderItem={({ item }) => <HistoryRow item={item} />}
        keyExtractor={(item, i) => item._id?.toString() || i.toString()}
        ListHeaderComponent={<HeaderComponent />}
        ListFooterComponent={<FooterComponent />}
        ListEmptyComponent={<EmptyComponent />}
        onEndReached={() => {
          if (historyHasMore && !historyLoadingMore && !historyLoading) loadMoreHistory();
        }}
        onEndReachedThreshold={0.3}
        contentContainerStyle={s.flatContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: D.bg },
  flatContent:     { paddingBottom: 110 },

  // Top bar
  topBar:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 18, marginBottom: 20 },
  topBarSub:       { fontSize: 10, color: D.textMuted, letterSpacing: 2.5, textTransform: 'uppercase' },
  topBarTitle:     { fontSize: 20, color: D.textPri, fontWeight: '700', marginTop: 2 },
  syncLine:        { fontSize: 10, color: D.textMuted, textAlign: 'right' },
  totalCount:      { fontSize: 11, color: D.textSec, fontWeight: '600' },

  // Section header
  sectionHeader:   { fontSize: 10, color: D.textMuted, letterSpacing: 2.5, fontWeight: '600', marginBottom: 8, marginTop: 4, paddingHorizontal: 18 },

  // Panel
  panel:           { backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, borderRadius: 12, padding: 14, marginHorizontal: 18, marginBottom: 18 },

  // Stat block
  statBlock:       { flex: 1, backgroundColor: D.surface2, borderWidth: 1, borderColor: D.border, borderRadius: 10, padding: 12 },
  statLabel:       { fontSize: 10, color: D.textMuted, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase' },
  statValue:       { fontSize: 30, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), fontWeight: '700', lineHeight: 36, marginTop: 2 },
  statUnit:        { fontSize: 11, color: D.textMuted },
  statTrack:       { height: 3, backgroundColor: '#1a1a1a', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  statFill:        { height: '100%', borderRadius: 2 },

  // Device
  deviceRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  deviceLabel:     { fontSize: 13, color: D.textSec, fontWeight: '600' },
  deviceStatus:    { fontSize: 15, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  hint:            { fontSize: 11, color: D.textMuted, marginTop: 10, fontStyle: 'italic', lineHeight: 16 },

  // Date picker
  dateBtn:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  dateBtnLabel:    { fontSize: 10, color: D.textMuted, letterSpacing: 2, fontWeight: '600' },
  dateBtnValue:    { fontSize: 13, color: D.textPri, fontWeight: '600', fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },
  dateDivider:     { height: 1, backgroundColor: D.border, marginVertical: 4 },

  // Delete button
  deleteBtn:       { marginTop: 14, borderWidth: 1, borderColor: D.dangerBorder, borderRadius: 10, backgroundColor: D.dangerBg, paddingVertical: 13, alignItems: 'center' },
  deleteBtnText:   { color: D.danger, fontWeight: '800', fontSize: 12, letterSpacing: 2 },

  // History header row
  historyHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 18 },
  refreshBtn:      { borderWidth: 1, borderColor: D.border2, borderRadius: 8, backgroundColor: D.surface, paddingHorizontal: 12, paddingVertical: 7, minWidth: 72, alignItems: 'center' },
  refreshBtnText:  { color: D.info, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },

  // History row
  historyRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, borderRadius: 10, marginHorizontal: 18, marginBottom: 6, borderLeftWidth: 1, borderLeftColor: D.border },
  historyTs:       { fontSize: 10, color: D.textMuted, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },
  historyVal:      { fontSize: 14, fontWeight: '700' },
  historyUnit:     { fontSize: 11, fontWeight: '400', color: D.textMuted },
  stateBadge:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },

  // Footer / empty / loading
  footerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
  footerText:      { color: D.textMuted, fontSize: 12 },
  footerEnd:       { textAlign: 'center', color: D.textMuted, fontSize: 10, letterSpacing: 2, paddingVertical: 20 },
  emptyWrap:       { padding: 32, alignItems: 'center' },
  emptyText:       { fontSize: 13, color: D.textMuted, fontStyle: 'italic' },
  loadingWrap:     { flex: 1, backgroundColor: D.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText:     { marginTop: 12, color: D.textSec, fontSize: 13, letterSpacing: 1 },
});

export default DataManagerScreen;