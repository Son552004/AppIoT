import React from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform
} from 'react-native';
import { StyledInput } from '../components/SharedComponents';

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
  danger:       '#ef4444',
  dangerBg:     '#1a0000',
  dangerBorder: '#dc2626',
  info:         '#60a5fa',
  infoBg:       '#0d1f3c',
  infoBorder:   '#1d4ed8',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function Panel({ children, style }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────
const SettingsScreen = ({
  userFullName, username, userId,
  wifiSsid, setWifiSsid,
  wifiPassword, setWifiPassword,
  isSetupSending,
  handleLinkDevice,
  handleLogout,
}) => {
  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Page header ── */}
      <View style={s.topBar}>
        <Text style={s.topBarSub}>Vehicle Safety Monitor</Text>
        <Text style={s.topBarTitle}>Cài đặt</Text>
      </View>

      {/* ── Profile card ── */}
      <SectionHeader title="TÀI KHOẢN" />
      <Panel style={s.profilePanel}>
        {/* Avatar monogram */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(userFullName || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{userFullName}</Text>
          {/* Username row */}
          <View style={s.profileMetaRow}>
            <View style={s.metaTag}>
              <Text style={s.metaTagLabel}>USER</Text>
              <Text style={s.metaTagValue}>{username}</Text>
            </View>
            <View style={s.metaTag}>
              <Text style={s.metaTagLabel}>ID</Text>
              <Text style={s.metaTagValue}>{userId}</Text>
            </View>
          </View>
        </View>
      </Panel>

      {/* ── ESP32 device setup ── */}
      <SectionHeader title="LIÊN KẾT THIẾT BỊ ESP32" />

      {/* Step list */}
      <Panel>
        {[
          'Cấp nguồn cho thiết bị MAX30100 + ESP32.',
          'Vào cài đặt Wi-Fi, kết nối mạng "ThietBi_YTe_01".',
          'Điền thông tin Wi-Fi nhà bên dưới rồi bấm Hoàn tất.',
        ].map((step, i) => (
          <View key={i} style={[s.stepRow, i < 2 && s.stepRowBorder]}>
            <View style={s.stepIndex}>
              <Text style={s.stepIndexText}>{i + 1}</Text>
            </View>
            <Text style={s.stepText}>{step}</Text>
          </View>
        ))}
      </Panel>

      {/* WiFi inputs */}
      <SectionHeader title="THÔNG TIN WI-FI" />
      <Panel>
        <StyledInput
          placeholder="Tên Wi-Fi (SSID)"
          value={wifiSsid}
          onChangeText={setWifiSsid}
          icon="📶"
        />
        <View style={s.inputDivider} />
        <StyledInput
          placeholder="Mật khẩu Wi-Fi"
          value={wifiPassword}
          onChangeText={setWifiPassword}
          secureTextEntry
          icon="🔑"
        />
      </Panel>

      {/* Submit button */}
      {isSetupSending ? (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={D.safe} />
          <Text style={s.loadingText}>Đang truyền cấu hình...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={s.confirmBtn}
          onPress={handleLinkDevice}
          activeOpacity={0.75}
        >
          <Text style={s.confirmBtnText}>HOÀN TẤT & TRUYỀN CẤU HÌNH</Text>
        </TouchableOpacity>
      )}

      {/* ── Danger zone ── */}
      <SectionHeader title="PHIÊN ĐĂNG NHẬP" />
      <Panel>
        <Text style={s.dangerHint}>
          Đăng xuất sẽ xoá phiên hiện tại. Dữ liệu trên server không bị ảnh hưởng.
        </Text>
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Text style={s.logoutBtnText}>ĐĂNG XUẤT</Text>
        </TouchableOpacity>
      </Panel>

      {/* Footer */}
      <Text style={s.footer}>Fusion Engine · MAX30100 + AI</Text>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll:          { backgroundColor: D.bg, padding: 18, paddingBottom: 110 },

  // Top bar
  topBar:          { marginBottom: 22, marginTop: 4 },
  topBarSub:       { fontSize: 10, color: D.textMuted, letterSpacing: 2.5, textTransform: 'uppercase' },
  topBarTitle:     { fontSize: 20, color: D.textPri, fontWeight: '700', marginTop: 2 },

  // Section header
  sectionHeader:   { fontSize: 10, color: D.textMuted, letterSpacing: 2.5, fontWeight: '600', marginBottom: 8, marginTop: 4 },

  // Panel
  panel:           { backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, borderRadius: 12, padding: 14, marginBottom: 18 },

  // Profile
  profilePanel:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:          { width: 52, height: 52, borderRadius: 10, backgroundColor: D.infoBg, borderWidth: 1, borderColor: D.infoBorder, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { fontSize: 22, fontWeight: '700', color: D.info, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },
  profileName:     { fontSize: 16, fontWeight: '700', color: D.textPri, marginBottom: 8 },
  profileMetaRow:  { flexDirection: 'row', gap: 8 },
  metaTag:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.surface2, borderWidth: 1, borderColor: D.border2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metaTagLabel:    { fontSize: 9, color: D.textMuted, fontWeight: '700', letterSpacing: 1.5 },
  metaTagValue:    { fontSize: 11, color: D.textSec, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), fontWeight: '600' },

  // Steps
  stepRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  stepRowBorder:   { borderBottomWidth: 1, borderBottomColor: D.border },
  stepIndex:       { width: 22, height: 22, borderRadius: 6, backgroundColor: D.infoBg, borderWidth: 1, borderColor: D.infoBorder, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  stepIndexText:   { fontSize: 11, fontWeight: '700', color: D.info, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },
  stepText:        { flex: 1, fontSize: 13, color: D.textSec, lineHeight: 20 },

  // Input
  inputDivider:    { height: 1, backgroundColor: D.border, marginVertical: 6 },

  // Confirm button
  confirmBtn:      { backgroundColor: D.safeBg, borderWidth: 1, borderColor: D.safeBorder, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 18 },
  confirmBtnText:  { color: D.safe, fontWeight: '800', fontSize: 12, letterSpacing: 2 },

  // Loading
  loadingRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, marginBottom: 18 },
  loadingText:     { color: D.safe, fontSize: 13, fontWeight: '600' },

  // Danger / logout
  dangerHint:      { fontSize: 11, color: D.textMuted, fontStyle: 'italic', lineHeight: 17, marginBottom: 12 },
  logoutBtn:       { backgroundColor: D.dangerBg, borderWidth: 1, borderColor: D.dangerBorder, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  logoutBtnText:   { color: D.danger, fontWeight: '800', fontSize: 12, letterSpacing: 2 },

  // Footer
  footer:          { textAlign: 'center', fontSize: 10, color: D.textMuted, letterSpacing: 1.5, marginTop: 8 },
});

export default SettingsScreen;