import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Dimensions, Animated, Vibration
} from 'react-native';
import io from 'socket.io-client';
import { LineChart } from 'react-native-chart-kit';

const SERVER_URL = 'https://server-rzzz.onrender.com';
const screenWidth = Dimensions.get("window").width;

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:        '#0d0f14',
  surface:   '#161a23',
  card:      '#1e2330',
  border:    '#2a3040',
  accent:    '#3b82f6',   // blue
  safe:      '#22c55e',   // green
  warn:      '#f59e0b',   // amber
  danger:    '#ef4444',   // red
  textPri:   '#f0f4ff',
  textSec:   '#7b8ba0',
  textMuted: '#4a5568',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getHeartRateColor = (hr) => {
  if (hr === 0) return C.textMuted;
  if (hr < 60 || hr > 100) return C.danger;
  if (hr < 65 || hr > 90)  return C.warn;
  return C.safe;
};

const getSpo2Color = (sp) => {
  if (sp === 0) return C.textMuted;
  if (sp < 90) return C.danger;
  if (sp < 95) return C.warn;
  return C.safe;
};

const getDrowsinessColor = (s) => {
  if (s === 'Buồn ngủ') return C.danger;
  if (s === 'Tỉnh táo')  return C.safe;
  return C.textMuted;
};

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────
const StyledInput = ({ placeholder, value, onChangeText, secureTextEntry, icon }) => (
  <View style={uiStyles.inputWrapper}>
    {icon && <Text style={uiStyles.inputIcon}>{icon}</Text>}
    <TextInput
      style={uiStyles.input}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
    />
  </View>
);

// Animated pulse ring for drowsiness warning
const PulseRing = ({ active, color }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!active) { scale.setValue(1); opacity.setValue(0); return; }
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale,   { toValue: 1.5, duration: 900, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active]);

  if (!active) return null;
  return (
    <Animated.View style={[uiStyles.pulseRing, { borderColor: color, transform: [{ scale }], opacity }]} />
  );
};

// Metric card with trend indicator
const MetricCard = ({ emoji, label, value, unit, color, subtext }) => (
  <View style={[uiStyles.metricCard, { borderColor: color + '44' }]}>
    <Text style={uiStyles.metricEmoji}>{emoji}</Text>
    <Text style={uiStyles.metricLabel}>{label}</Text>
    <View style={uiStyles.metricValueRow}>
      <Text style={[uiStyles.metricValue, { color }]}>{value || '—'}</Text>
      <Text style={[uiStyles.metricUnit, { color }]}>{unit}</Text>
    </View>
    {subtext ? <Text style={uiStyles.metricSubtext}>{subtext}</Text> : null}
  </View>
);

// Compact chart for a single dataset
const MiniChart = ({ data, labels, color, title, unit }) => {
  const safeData = (data && data.length > 0 && data.some(v => v > 0)) ? data : [0, 0];
  const safeLabels = labels && labels.length > 0 ? labels : ['', ''];
  return (
    <View style={uiStyles.chartBlock}>
      <Text style={uiStyles.chartTitle}>{title}</Text>
      <LineChart
        data={{ labels: safeLabels, datasets: [{ data: safeData, color: () => color, strokeWidth: 2 }] }}
        width={screenWidth - 48}
        height={160}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        chartConfig={{
          backgroundColor: C.card,
          backgroundGradientFrom: C.card,
          backgroundGradientTo: C.card,
          decimalPlaces: 0,
          color: (opacity = 1) => color,
          labelColor: () => C.textSec,
          propsForLabels: { fontSize: 10 },
          fillShadowGradient: color,
          fillShadowGradientOpacity: 0.15,
        }}
        bezier
        style={{ borderRadius: 12 }}
      />
      <Text style={uiStyles.chartUnit}>{unit}</Text>
    </View>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const App = () => {
  // Navigation
  const [screen, setScreen] = useState('Login');

  // Auth state
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [fullName, setFullName]     = useState('');
  const [userId, setUserId]         = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [isLoading, setIsLoading]   = useState(false);

  // Health data
  const [heartRate, setHeartRate]   = useState(0);
  const [spo2, setSpo2]             = useState(0);
  const [status, setStatus]         = useState('Đang chờ...');
  const [historyData, setHistoryData] = useState([]);

  // Driving session
  const [isDriving, setIsDriving]         = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [drowsyEvents, setDrowsyEvents]    = useState(0);
  const sessionTimer = useRef(null);
  const prevStatus = useRef('');

  // Device setup
  const [wifiSsid, setWifiSsid]           = useState('');
  const [wifiPassword, setWifiPassword]   = useState('');
  const [isSetupSending, setIsSetupSending] = useState(false);

  // Drowsiness warning animation
  const alertAnim = useRef(new Animated.Value(0)).current;
  const isDrowsy = status === 'Buồn ngủ';

  // ── Drowsiness alert effect ──────────────────────────────────────────────
  useEffect(() => {
    if (isDrowsy && isDriving) {
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
      Animated.timing(alertAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    } else {
      Animated.timing(alertAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    }
    // Count drowsiness events
    if (isDriving && status === 'Buồn ngủ' && prevStatus.current !== 'Buồn ngủ') {
      setDrowsyEvents(n => n + 1);
    }
    prevStatus.current = status;
  }, [status, isDriving]);

  // ── Session timer ────────────────────────────────────────────────────────
  const startDriving = () => {
    setIsDriving(true);
    setSessionSeconds(0);
    setDrowsyEvents(0);
    sessionTimer.current = setInterval(() => setSessionSeconds(s => s + 1), 1000);
  };

  const stopDriving = () => {
    setIsDriving(false);
    clearInterval(sessionTimer.current);
    Alert.alert(
      '🏁 Kết thúc chuyến đi',
      `Thời gian: ${formatDuration(sessionSeconds)}\nSự kiện buồn ngủ: ${drowsyEvents} lần\n\n${drowsyEvents > 2 ? '⚠️ Bạn nên nghỉ ngơi trước khi lái tiếp!' : '✅ Chuyến đi an toàn!'}`,
      [{ text: 'OK' }]
    );
  };

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchHistory = async (uid) => {
    if (!uid) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/data/${uid}`);
      const data = await res.json();
      if (res.ok) setHistoryData(data);
    } catch (_) {}
  };

  // ── Auth handlers ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!username || !password) return Alert.alert('Lỗi', 'Vui lòng nhập đủ thông tin.');
    setIsLoading(true);
    try {
      const res  = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserFullName(data.fullName);
        setUserId(data.userId);
        fetchHistory(data.userId);
        setScreen('Dashboard');
      } else Alert.alert('Đăng nhập thất bại', data.error);
    } catch (_) { Alert.alert('Lỗi kết nối', 'Không tìm thấy Server.'); }
    finally { setIsLoading(false); }
  };

  const handleRegister = async () => {
    if (!username || !password || !fullName) return Alert.alert('Lỗi', 'Nhập đủ thông tin.');
    setIsLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName }),
      });
      if (res.ok) {
        Alert.alert('Thành công', 'Tài khoản đã tạo. Hãy đăng nhập.');
        setScreen('Login'); setPassword('');
      } else Alert.alert('Lỗi', (await res.json()).error);
    } catch (_) { Alert.alert('Lỗi kết nối', 'Không tìm thấy Server.'); }
    finally { setIsLoading(false); }
  };

  const handleLinkDevice = async () => {
    if (!wifiSsid) return Alert.alert('Lỗi', 'Vui lòng nhập tên Wi-Fi!');
    setIsSetupSending(true);
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      await fetch('http://192.168.4.1/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: wifiSsid, password: wifiPassword, userId }),
        signal: controller.signal,
      });
      Alert.alert('Thành công! 🎉', 'ESP32 đang khởi động lại.\n\n⚠️ Kết nối lại Wi-Fi nhà trước khi nhấn OK.', [
        { text: 'Đã kết nối lại', onPress: () => { setWifiPassword(''); setScreen('Dashboard'); } }
      ]);
    } catch (_) {
      Alert.alert('Lỗi', 'Không tìm thấy thiết bị. Hãy kết nối Wi-Fi "ThietBi_YTe_01".');
    } finally { setIsSetupSending(false); }
  };

  // Thay dependency của useEffect từ [screen, userId] → [userId]
// Điều này giúp Socket hoạt động độc lập với screen
useEffect(() => {
    // Kết nối socket khi có userId (không phụ thuộc vào screen)
    if (!userId) return;
    
    const socket = io(SERVER_URL, { 
      transports: ['websocket'], 
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
 
    socket.on('connect', () => {
      console.log('✅ Socket connected');
      setStatus('Đang nhận dữ liệu...');
    });
 
    socket.on('health_update', (data) => {
      console.log('📨 Received health_update:', data);
      
      // Cập nhật dữ liệu nếu khớp userId
      // Hỗ trợ cả data.userId (từ MQTT) và data.heartRate từ bất kỳ nguồn nào
      if (!data.userId || data.userId == userId) {
        setHeartRate(data.heartRate || 0);
        setSpo2(data.spo2 || 0);
        setStatus(data.drowsinessStatus || 'N/A');
        
        // Cập nhật history mỗi 5 giây
        if (new Date().getSeconds() % 5 === 0) {
          fetchHistory(userId);
        }
      }
    });
 
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });
 
    socket.on('error', (error) => {
      console.log('⚠️ Socket error:', error);
    });
 
    return () => {
      socket.off('connect');
      socket.off('health_update');
      socket.off('disconnect');
      socket.off('error');
      socket.disconnect();
    };
  }, [userId]);
  // ── Chart data preparation ───────────────────────────────────────────────
  const chartPoints = [...historyData].reverse().slice(-12);
  const chartLabels = chartPoints.length > 0
    ? chartPoints.map(d => { const t = new Date(d.timestamp); return `${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`; })
    : [''];
  const bpmData   = chartPoints.length > 0 ? chartPoints.map(d => d.bpm  || 0) : [0];
  const spo2Data  = chartPoints.length > 0 ? chartPoints.map(d => d.spo2 || 0) : [0];

  // Derived stats from history
  const avgBpm  = bpmData.some(v=>v>0)  ? Math.round(bpmData.reduce((a,b)=>a+b,0)  / bpmData.filter(v=>v>0).length)  : 0;
  const avgSpo2 = spo2Data.some(v=>v>0) ? Math.round(spo2Data.reduce((a,b)=>a+b,0) / spo2Data.filter(v=>v>0).length) : 0;
  const maxBpm  = bpmData.some(v=>v>0)  ? Math.max(...bpmData.filter(v=>v>0))  : 0;
  const minSpo2 = spo2Data.some(v=>v>0) ? Math.min(...spo2Data.filter(v=>v>0)) : 0;

  const hrColor  = getHeartRateColor(heartRate);
  const sp2Color = getSpo2Color(spo2);
  const stColor  = getDrowsinessColor(status);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREENS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (screen === 'Login') return (
    <View style={authStyles.container}>
      <View style={authStyles.logoArea}>
        <Text style={authStyles.logoIcon}>🚗</Text>
        <Text style={authStyles.appName}>DriveGuard</Text>
        <Text style={authStyles.tagline}>Giám sát sức khỏe khi lái xe</Text>
      </View>
      <View style={authStyles.form}>
        <StyledInput placeholder="Tên đăng nhập" value={username} onChangeText={setUsername} icon="👤" />
        <StyledInput placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry icon="🔒" />
        {isLoading
          ? <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 20 }} />
          : <TouchableOpacity style={authStyles.btnPrimary} onPress={handleLogin}>
              <Text style={authStyles.btnText}>ĐĂNG NHẬP</Text>
            </TouchableOpacity>
        }
        <TouchableOpacity onPress={() => setScreen('Register')} style={{ marginTop: 20 }}>
          <Text style={authStyles.link}>Chưa có tài khoản? <Text style={{ color: C.accent, fontWeight: '700' }}>Đăng ký ngay</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── REGISTER ───────────────────────────────────────────────────────────────
  if (screen === 'Register') return (
    <View style={authStyles.container}>
      <View style={authStyles.logoArea}>
        <Text style={authStyles.logoIcon}></Text>
        <Text style={authStyles.appName}>DriveGuard</Text>
        <Text style={authStyles.tagline}>Tạo tài khoản mới</Text>
      </View>
      <View style={authStyles.form}>
        <StyledInput placeholder="Họ và tên" value={fullName} onChangeText={setFullName} icon="📛" />
        <StyledInput placeholder="Tên đăng nhập" value={username} onChangeText={setUsername} icon="👤" />
        <StyledInput placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry icon="🔒" />
        {isLoading
          ? <ActivityIndicator size="large" color={C.safe} style={{ marginTop: 20 }} />
          : <TouchableOpacity style={[authStyles.btnPrimary, { backgroundColor: C.safe }]} onPress={handleRegister}>
              <Text style={authStyles.btnText}>TẠO TÀI KHOẢN</Text>
            </TouchableOpacity>
        }
        <TouchableOpacity onPress={() => setScreen('Login')} style={{ marginTop: 20 }}>
          <Text style={authStyles.link}>← Quay lại đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── MAIN APP (has bottom nav) ──────────────────────────────────────────────
  return (
    <SafeAreaView style={appStyles.safe}>

      {/* ── DROWSINESS FULL-SCREEN ALERT BANNER ── */}
      {isDrowsy && isDriving && (
        <Animated.View style={[appStyles.drowsyBanner, {
          opacity: alertAnim,
          transform: [{ translateY: alertAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }]
        }]}>
          <Text style={appStyles.drowsyBannerIcon}>⚠️</Text>
          <Text style={appStyles.drowsyBannerText}>PHÁT HIỆN BUỒN NGỦ — HÃY DỪNG XE!</Text>
        </Animated.View>
      )}

      <View style={{ flex: 1 }}>

        {/* ════════════ DASHBOARD ════════════ */}
        {screen === 'Dashboard' && (
          <ScrollView contentContainerStyle={appStyles.scroll} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={appStyles.topBar}>
              <View>
                <Text style={appStyles.greeting}>Xin chào,</Text>
                <Text style={appStyles.greetingName}>{userFullName} 👋</Text>
              </View>
              <View style={[appStyles.connectionDot, { backgroundColor: heartRate > 0 ? C.safe : C.textMuted }]} />
            </View>

            {/* ── DROWSINESS STATUS CARD ── */}
            <View style={[appStyles.statusCard, { borderColor: stColor + '66', backgroundColor: stColor + '11' }]}>
              <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', width: 56, height: 56 }}>
                <PulseRing active={isDrowsy && isDriving} color={C.danger} />
                <Text style={{ fontSize: 30 }}>{status === 'Tỉnh táo' ? '😊' : status === 'Buồn ngủ' ? '😴' : '🔄'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={appStyles.statusLabel}>Trạng thái AI</Text>
                <Text style={[appStyles.statusValue, { color: stColor }]}>{status.toUpperCase()}</Text>
              </View>
            </View>

            {/* ── DRIVING SESSION CONTROL ── */}
            <View style={appStyles.sessionCard}>
              {isDriving ? (
                <>
                  <View style={appStyles.sessionInfo}>
                    <View style={appStyles.sessionStat}>
                      <Text style={appStyles.sessionStatLabel}>⏱ Thời gian</Text>
                      <Text style={appStyles.sessionStatValue}>{formatDuration(sessionSeconds)}</Text>
                    </View>
                    <View style={[appStyles.sessionDivider]} />
                    <View style={appStyles.sessionStat}>
                      <Text style={appStyles.sessionStatLabel}>😴 Buồn ngủ</Text>
                      <Text style={[appStyles.sessionStatValue, { color: drowsyEvents > 0 ? C.danger : C.safe }]}>
                        {drowsyEvents} lần
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[appStyles.sessionBtn, { backgroundColor: C.danger }]} onPress={stopDriving}>
                    <Text style={appStyles.sessionBtnText}>🏁  KẾT THÚC CHUYẾN ĐI</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={appStyles.sessionIdleText}>Bạn chưa bắt đầu chuyến đi</Text>
                  <TouchableOpacity style={[appStyles.sessionBtn, { backgroundColor: C.safe }]} onPress={startDriving}>
                    <Text style={appStyles.sessionBtnText}>  BẮT ĐẦU CHUYẾN ĐI</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* ── VITAL METRICS ── */}
            <View style={appStyles.metricsRow}>
              <MetricCard
                emoji="❤️" label="Nhịp tim"
                value={heartRate || '—'} unit="bpm"
                color={hrColor}
                subtext={heartRate > 0 ? (heartRate < 60 ? 'Quá chậm' : heartRate > 100 ? 'Quá nhanh' : 'Bình thường') : ''}
              />
              <MetricCard
                emoji="🩸" label="SpO2"
                value={spo2 || '—'} unit="%"
                color={sp2Color}
                subtext={spo2 > 0 ? (spo2 < 90 ? 'Nguy hiểm' : spo2 < 95 ? 'Thấp' : 'Bình thường') : ''}
              />
            </View>

            {/* ── CHARTS ── */}
            <Text style={appStyles.sectionTitle}>📈 Xu hướng dữ liệu</Text>
            <MiniChart data={bpmData} labels={chartLabels} color={C.danger} title="Nhịp tim (BPM)" unit="Nhịp/phút" />
            <MiniChart data={spo2Data} labels={chartLabels} color={C.accent}  title="Độ bão hòa oxy (SpO2)" unit="%" />

          </ScrollView>
        )}

        {/* ════════════ STATS ════════════ */}
        {screen === 'Stats' && (
          <ScrollView contentContainerStyle={appStyles.scroll}>
            <Text style={appStyles.pageTitle}>📊 Thống kê sức khỏe</Text>
            <Text style={appStyles.pageSubtitle}>Dựa trên {historyData.length} bản ghi gần nhất</Text>

            <View style={appStyles.statsGrid}>
              {[
                { label: 'BPM Trung bình', value: avgBpm,  unit: 'bpm', color: C.danger, icon: '❤️' },
                { label: 'BPM Cao nhất',   value: maxBpm,  unit: 'bpm', color: C.warn,   icon: '📈' },
                { label: 'SpO2 Trung bình',value: avgSpo2, unit: '%',   color: C.accent, icon: '🩸' },
                { label: 'SpO2 Thấp nhất', value: minSpo2, unit: '%',   color: minSpo2 < 95 ? C.danger : C.safe, icon: '📉' },
              ].map(s => (
                <View key={s.label} style={appStyles.statCell}>
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</Text>
                  <Text style={[appStyles.statCellValue, { color: s.color }]}>{s.value || '—'} <Text style={appStyles.statCellUnit}>{s.unit}</Text></Text>
                  <Text style={appStyles.statCellLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Safety level indicator */}
            <View style={appStyles.safetyCard}>
              <Text style={appStyles.safetyTitle}>Mức độ an toàn khi lái</Text>
              {(() => {
                const score = [
                  avgBpm  >= 60 && avgBpm  <= 100 ? 33 : 0,
                  avgSpo2 >= 95 ? 33 : avgSpo2 >= 90 ? 16 : 0,
                  drowsyEvents === 0 ? 34 : drowsyEvents <= 2 ? 17 : 0,
                ].reduce((a, b) => a + b, 0);
                const color = score >= 80 ? C.safe : score >= 50 ? C.warn : C.danger;
                const label = score >= 80 ? 'AN TOÀN' : score >= 50 ? 'CẦN CHÚ Ý' : 'NGUY HIỂM';
                return (
                  <>
                    <View style={appStyles.safetyBarBg}>
                      <View style={[appStyles.safetyBarFill, { width: `${score}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[appStyles.safetyLabel, { color }]}>{label} ({score}%)</Text>
                  </>
                );
              })()}
            </View>

            <TouchableOpacity style={appStyles.refreshBtn} onPress={() => fetchHistory(userId)}>
              <Text style={appStyles.refreshBtnText}>  Làm mới dữ liệu</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ════════════ SETTINGS ════════════ */}
        {screen === 'Settings' && (
          <ScrollView contentContainerStyle={appStyles.scroll}>
            <Text style={appStyles.pageTitle}>⚙️ Cài đặt</Text>

            {/* User card */}
            <View style={appStyles.profileCard}>
              <View style={appStyles.avatarCircle}><Text style={{ fontSize: 36 }}>👤</Text></View>
              <View style={{ marginLeft: 16 }}>
                <Text style={appStyles.profileName}>{userFullName}</Text>
                <Text style={appStyles.profileSub}>@{username}  ·  ID: {userId}</Text>
              </View>
            </View>

            {/* Device setup section */}
            <Text style={appStyles.settingsSectionTitle}>🔗 Liên kết thiết bị ESP32</Text>
            <View style={appStyles.infoSteps}>
              {['Cấp nguồn cho thiết bị.',
                'Vào cài đặt Wi-Fi, chọn mạng "ThietBi_YTe_01".',
                'Điền Wi-Fi nhà bạn bên dưới và bấm Hoàn tất.'
              ].map((s, i) => (
                <Text key={i} style={appStyles.infoStep}><Text style={{ color: C.accent, fontWeight: '700' }}>{i+1}.</Text> {s}</Text>
              ))}
            </View>
            <StyledInput placeholder="Tên Wi-Fi (SSID)" value={wifiSsid} onChangeText={setWifiSsid}  />
            <StyledInput placeholder="Mật khẩu Wi-Fi" value={wifiPassword} onChangeText={setWifiPassword} secureTextEntry  />
            {isSetupSending
              ? <ActivityIndicator size="large" color={C.safe} style={{ marginTop: 16 }} />
              : <TouchableOpacity style={[appStyles.sessionBtn, { backgroundColor: C.safe, marginTop: 8 }]} onPress={handleLinkDevice}>
                  <Text style={appStyles.sessionBtnText}>  HOÀN TẤT & TRUYỀN CẤU HÌNH</Text>
                </TouchableOpacity>
            }

            {/* Logout */}
            <TouchableOpacity
              style={[appStyles.sessionBtn, { backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: C.danger, marginTop: 30 }]}
              onPress={() => { setScreen('Login'); setPassword(''); setHistoryData([]); setIsDriving(false); clearInterval(sessionTimer.current); }}
            >
              <Text style={[appStyles.sessionBtnText, { color: C.danger }]}>ĐĂNG XUẤT</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ── BOTTOM NAVIGATION ── */}
      <View style={navStyles.bar}>
        {[
          { id: 'Dashboard', icon: '🏠', label: 'Tổng quan' },
          { id: 'Stats',     icon: '📊', label: 'Thống kê' },
          { id: 'Settings',  icon: '⚙️', label: 'Cài đặt' },
        ].map(tab => (
          <TouchableOpacity key={tab.id} style={navStyles.item} onPress={() => setScreen(tab.id)}>
            <Text style={[navStyles.icon, screen === tab.id && navStyles.iconActive]}>{tab.icon}</Text>
            <Text style={[navStyles.label, screen === tab.id && navStyles.labelActive]}>{tab.label}</Text>
            {screen === tab.id && <View style={navStyles.activePip} />}
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', paddingHorizontal: 28 },
  logoArea:  { alignItems: 'center', marginBottom: 40 },
  logoIcon:  { fontSize: 60, marginBottom: 12 },
  appName:   { fontSize: 34, fontWeight: '900', color: C.textPri, letterSpacing: 1 },
  tagline:   { fontSize: 14, color: C.textSec, marginTop: 4 },
  form:      { backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border },
  btnPrimary:{ backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText:   { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  link:      { color: C.textSec, textAlign: 'center', fontSize: 14 },
});

const uiStyles = StyleSheet.create({
  inputWrapper:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12, paddingHorizontal: 14 },
  inputIcon:     { fontSize: 16, marginRight: 10 },
  input:         { flex: 1, color: C.textPri, fontSize: 15, paddingVertical: 14 },
  pulseRing:     { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  metricCard:    { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, marginHorizontal: 4 },
  metricEmoji:   { fontSize: 26, marginBottom: 4 },
  metricLabel:   { fontSize: 12, color: C.textSec, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValueRow:{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  metricValue:   { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  metricUnit:    { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  metricSubtext: { fontSize: 11, color: C.textSec, marginTop: 4 },
  chartBlock:    { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  chartTitle:    { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  chartUnit:     { fontSize: 11, color: C.textMuted, textAlign: 'right', marginTop: 4 },
});

const appStyles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: C.bg },
  scroll:            { padding: 20, paddingBottom: 100 },
  // Drowsiness banner
  drowsyBanner:      { backgroundColor: C.danger, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 99 },
  drowsyBannerIcon:  { fontSize: 20 },
  drowsyBannerText:  { color: '#fff', fontWeight: '900', fontSize: 14, flex: 1, letterSpacing: 0.5 },
  // Top bar
  topBar:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:          { fontSize: 13, color: C.textSec, fontWeight: '500' },
  greetingName:      { fontSize: 22, color: C.textPri, fontWeight: '800' },
  connectionDot:     { width: 10, height: 10, borderRadius: 5 },
  // Status card
  statusCard:        { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 16 },
  statusLabel:       { fontSize: 12, color: C.textSec, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue:       { fontSize: 22, fontWeight: '900', marginTop: 2 },
  // Session card
  sessionCard:       { backgroundColor: C.surface, borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  sessionInfo:       { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  sessionStat:       { alignItems: 'center' },
  sessionStatLabel:  { fontSize: 12, color: C.textSec, fontWeight: '600', marginBottom: 4 },
  sessionStatValue:  { fontSize: 22, fontWeight: '900', color: C.textPri },
  sessionDivider:    { width: 1, backgroundColor: C.border },
  sessionIdleText:   { fontSize: 14, color: C.textSec, textAlign: 'center', marginBottom: 16 },
  sessionBtn:        { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sessionBtnText:    { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  // Metrics
  metricsRow:        { flexDirection: 'row', marginBottom: 28 },
  // Section title
  sectionTitle:      { fontSize: 15, fontWeight: '800', color: C.textPri, marginBottom: 14, letterSpacing: 0.3 },
  pageTitle:         { fontSize: 24, fontWeight: '900', color: C.textPri, marginBottom: 4 },
  pageSubtitle:      { fontSize: 13, color: C.textSec, marginBottom: 24 },
  // Stats grid
  statsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCell:          { width: (screenWidth - 52) / 2, backgroundColor: C.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border },
  statCellValue:     { fontSize: 26, fontWeight: '900', marginBottom: 2 },
  statCellUnit:      { fontSize: 14, fontWeight: '500', color: C.textSec },
  statCellLabel:     { fontSize: 12, color: C.textSec, fontWeight: '600' },
  // Safety card
  safetyCard:        { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  safetyTitle:       { fontSize: 14, fontWeight: '700', color: C.textPri, marginBottom: 12 },
  safetyBarBg:       { height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  safetyBarFill:     { height: '100%', borderRadius: 5 },
  safetyLabel:       { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  // Refresh
  refreshBtn:        { borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  refreshBtnText:    { color: C.accent, fontWeight: '700', fontSize: 14 },
  // Settings
  profileCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 18, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: C.border },
  avatarCircle:      { width: 60, height: 60, borderRadius: 30, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  profileName:       { fontSize: 18, fontWeight: '800', color: C.textPri },
  profileSub:        { fontSize: 13, color: C.textSec, marginTop: 3 },
  settingsSectionTitle: { fontSize: 14, fontWeight: '800', color: C.textSec, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  infoSteps:         { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border, gap: 8 },
  infoStep:          { fontSize: 13, color: C.textSec, lineHeight: 20 },
});

const navStyles = StyleSheet.create({
  bar:         { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 16, paddingTop: 10 },
  item:        { flex: 1, alignItems: 'center', position: 'relative' },
  icon:        { fontSize: 22, opacity: 0.4 },
  iconActive:  { opacity: 1 },
  label:       { fontSize: 11, color: C.textMuted, marginTop: 3, fontWeight: '600' },
  labelActive: { color: C.accent, fontWeight: '800' },
  activePip:   { position: 'absolute', bottom: -6, width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent },
});

export default App;