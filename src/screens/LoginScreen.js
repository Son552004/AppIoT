import React, { useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Animated, Platform
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
  info:         '#60a5fa',
  infoBg:       '#0d1f3c',
  infoBorder:   '#1d4ed8',
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const LoginScreen = ({
  username, setUsername,
  password, setPassword,
  isLoading, handleLogin,
  setScreen,
}) => {
  // Subtle fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);



  return (
    <View style={s.root}>
      <Animated.View style={[s.inner, { opacity: fadeAnim }]}>

        {/* ── Logo area ── */}
        <View style={s.logoArea}>
          {/* Monogram shield badge */}
          <View style={s.badge}>
            <Text style={s.badgeText}>SD</Text>
          </View>

          <Text style={s.appName}>S-DRIVE</Text>
          <Text style={s.tagline}>Hệ thống giám sát tài xế thông minh</Text>

        </View>

        {/* ── Form panel ── */}
        <View style={s.panel}>
          <Text style={s.panelLabel}>XÁC THỰC TÀI KHOẢN</Text>

          <StyledInput
            placeholder="Tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            icon="👤"
          />
          <View style={s.inputDivider} />
          <StyledInput
            placeholder="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon="🔒"
          />

          <TouchableOpacity
            style={[s.loginBtn, isLoading && { opacity: 0.5 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.75}
          >
            {isLoading ? (
              <ActivityIndicator color={D.safe} size="small" />
            ) : (
              <Text style={s.loginBtnText}>ĐĂNG NHẬP HỆ THỐNG</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Register link ── */}
        <TouchableOpacity style={s.registerRow} onPress={() => setScreen('Register')} activeOpacity={0.7}>
          <Text style={s.registerText}>Chưa có tài khoản?</Text>
          <View style={s.registerTag}>
            <Text style={s.registerTagText}>ĐĂNG KÝ NGAY</Text>
          </View>
        </TouchableOpacity>

        {/* ── Footer ── */}
        <Text style={s.footer}>Fusion Engine · MAX30100 + AI</Text>

      </Animated.View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: D.bg, justifyContent: 'center' },
  inner:          { paddingHorizontal: 24 },

  // Logo
  logoArea:       { alignItems: 'center', marginBottom: 36 },
  badge:          { width: 64, height: 64, borderRadius: 14, backgroundColor: D.infoBg, borderWidth: 1.5, borderColor: D.infoBorder, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  badgeText:      { fontSize: 22, fontWeight: '800', color: D.info, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }), letterSpacing: 2 },
  appName:        { fontSize: 32, fontWeight: '900', color: D.textPri, letterSpacing: 4, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },
  tagline:        { fontSize: 12, color: D.textMuted, marginTop: 6, letterSpacing: 1, textAlign: 'center' },

  // Panel
  panel:          { backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, borderRadius: 14, padding: 18, marginBottom: 16 },
  panelLabel:     { fontSize: 10, color: D.textMuted, fontWeight: '600', letterSpacing: 2.5, marginBottom: 14 },
  inputDivider:   { height: 1, backgroundColor: D.border, marginVertical: 6 },

  // Login button
  loginBtn:       { backgroundColor: D.safeBg, borderWidth: 1, borderColor: D.safeBorder, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  loginBtnText:   { color: D.safe, fontWeight: '800', fontSize: 12, letterSpacing: 2 },

  // Register row
  registerRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 32 },
  registerText:   { fontSize: 13, color: D.textMuted },
  registerTag:    { borderWidth: 1, borderColor: D.border2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: D.surface2 },
  registerTagText:{ fontSize: 10, fontWeight: '700', color: D.info, letterSpacing: 1.5 },

  // Footer
  footer:         { textAlign: 'center', fontSize: 10, color: D.textMuted, letterSpacing: 1.5 },
});

export default LoginScreen;