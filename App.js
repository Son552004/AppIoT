import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SafeAreaView, View, StyleSheet, TouchableOpacity, Text, Alert, Vibration, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

// Constants & Theme
import { C, SERVER_URL } from './src/constants/theme';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DataManagerScreen from './src/screens/DataManagerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Helpers
import { formatDuration, getHeartRateColor, getSpo2Color, getDrowsinessColor } from './src/utils/helpers';

const AUTH_STORAGE_KEY = '@health_iot_auth';

const App = () => {
  // Navigation State
  const [screen, setScreen] = useState('Login');

  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userId, setUserId] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [token, setToken] = useState(''); // ✅ Lưu JWT Token
  const [isLoading, setIsLoading] = useState(false);

  // Health Data State
  const [heartRate, setHeartRate] = useState(0);
  const [spo2, setSpo2] = useState(0);
  const [status, setStatus] = useState('Đang chờ...');
  const [connectionStatus, setConnectionStatus] = useState('Đang chờ kết nối...');

  // Driving Session State
  const [isDriving, setIsDriving] = useState(false);
  const [sessionStartAt, setSessionStartAt] = useState(null);
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [drowsyEvents, setDrowsyEvents] = useState(0);
  const sessionClock = useRef(null);
  const prevStatus = useRef('');
  const socketRef = useRef(null);

  // Device & History Management State
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [isSetupSending, setIsSetupSending] = useState(false);
  const [allHistory, setAllHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastHistorySync, setLastHistorySync] = useState(null);
  const [historyPage, setHistoryPage] = useState(1); // ✅ Trang hiện tại
  const [historyHasMore, setHistoryHasMore] = useState(true); // ✅ Còn dữ liệu không
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false); // ✅ Loading thêm trang
  const [deviceActive, setDeviceActive] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  // Animation for warning
  const alertAnim = useRef(new Animated.Value(0)).current;
  const isDrowsy = status === 'Buồn ngủ';
  const sessionSeconds = useMemo(() => Math.floor(sessionElapsedMs / 1000), [sessionElapsedMs]);

  // --- Effects ---
  useEffect(() => {
    const becameDrowsy = isDriving && status === 'Buồn ngủ' && prevStatus.current !== 'Buồn ngủ';

    if (becameDrowsy) {
      Vibration.vibrate([0, 400, 200, 400]);
      setDrowsyEvents(n => n + 1);
      Animated.timing(alertAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    } else if (!isDrowsy) {
      Vibration.cancel();
      Animated.timing(alertAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    }

    prevStatus.current = status;
  }, [status, isDriving, isDrowsy, alertAnim]);

  useEffect(() => {
    if (!userId || !token) return; // ✅ Đợi có token

    const socket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      auth: { token }, // ✅ Gửi token lên server
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('Đang kết nối realtime'));
    socket.on('disconnect', () => setConnectionStatus('Mất kết nối realtime'));
    socket.on('connect_error', () => setConnectionStatus('Lỗi kết nối realtime'));
    socket.on('health_update', data => {
      if (String(data.userId) === String(userId)) {
        setHeartRate(data.heartRate || 0);
        setSpo2(data.spo2 || 0);
        setStatus(data.drowsinessStatus || 'Tỉnh táo');
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, token]); // ✅ Thêm token vào dependency

  useEffect(() => {
    const loadSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved?.userId) {
          setUserId(saved.userId);
          setUserFullName(saved.userFullName || '');
          setUsername(saved.username || '');
          setToken(saved.token || ''); // ✅ Restore token từ storage
          setScreen('Dashboard');
        }
      } catch (_) {
        // Ignore invalid cached session and continue as logged-out
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    if (!isDriving || !sessionStartAt) {
      clearInterval(sessionClock.current);
      sessionClock.current = null;
      return;
    }

    const updateSessionElapsed = () => setSessionElapsedMs(Date.now() - sessionStartAt);
    updateSessionElapsed();
    sessionClock.current = setInterval(updateSessionElapsed, 1000);

    return () => {
      clearInterval(sessionClock.current);
      sessionClock.current = null;
    };
  }, [isDriving, sessionStartAt]);

  // --- Handlers ---
  const handleLogin = async () => {
    if (!username || !password) return Alert.alert('Lỗi', 'Nhập đủ thông tin.');
    setIsLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserId(data.userId);
        setUserFullName(data.fullName);
        setToken(data.token); // ✅ Lưu token
        await AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            userId: data.userId,
            userFullName: data.fullName,
            token: data.token, // ✅ Lưu token vào AsyncStorage
            username,
          }),
        );
        setScreen('Dashboard');
      } else Alert.alert('Thất bại', data.error);
    } catch (_) { Alert.alert('Lỗi', 'Không kết nối được server.'); }
    finally { setIsLoading(false); }
  };

  const handleRegister = async () => {
    if (!username || !password || !fullName) return Alert.alert('Lỗi', 'Nhập đủ thông tin.');
    setIsLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName }),
      });
      if (res.ok) {
        Alert.alert('Thành công', 'Hãy đăng nhập.');
        setScreen('Login');
      } else Alert.alert('Lỗi', (await res.json()).error);
    } catch (_) { Alert.alert('Lỗi', 'Không kết nối được server.'); }
    finally { setIsLoading(false); }
  };

  const handleLinkDevice = async () => {
    const ssid = wifiSsid.trim();
    const password = wifiPassword.trim();

    if (!userId) return Alert.alert('Lỗi', 'Không tìm thấy người dùng đăng nhập.');
    if (!ssid) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên Wi-Fi (SSID).');
    if (!password) return Alert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu Wi-Fi.');

    const candidateRequests = [
      {
        url: 'http://192.168.4.1/setup',
        body: { ssid, password, userId, username },
      },
      {
        url: 'http://192.168.4.1/config',
        body: {
          wifiSsid: ssid,
          wifiPassword: password,
          userId,
          username,
        },
      },
      {
        url: 'http://192.168.4.1/wifi',
        body: { ssid, password, userId, username },
      },
      {
        url: 'http://192.168.4.1/connect',
        body: { ssid, password, userId, username },
      },
      {
        url: `${SERVER_URL}/api/device/control`,
        body: {
          command: 'SETUP_WIFI',
          userId,
          ssid,
          password,
          wifiSsid: ssid,
          wifiPassword: password,
        },
      },
      {
        url: `${SERVER_URL}/api/device/control`,
        body: {
          command: 'LINK_DEVICE',
          userId,
          ssid,
          password,
          wifiSsid: ssid,
          wifiPassword: password,
        },
      },
      {
        url: `${SERVER_URL}/api/device/setup`,
        body: { userId, ssid, password },
      },
      {
        url: `${SERVER_URL}/api/device/config`,
        body: { userId, wifiSsid: ssid, wifiPassword: password },
      },
    ];

    setIsSetupSending(true);
    let finalError = 'Không truyền được cấu hình tới thiết bị.';

    try {
      for (const request of candidateRequests) {
        try {
          const res = await fetch(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.body),
          });

          const raw = await res.text();
          let data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch (_) {
            data = null;
          }

          if (res.ok) {
            const isLocalEsp = request.url.startsWith('http://192.168.4.1');
            Alert.alert(
              'Thành công',
              data?.message || (isLocalEsp
                ? 'Đã gửi trực tiếp cấu hình tới ESP32.'
                : 'Đã gửi cấu hình Wi-Fi tới ESP32 qua server.'),
            );
            setWifiPassword('');
            return;
          }

          finalError = data?.error || data?.message || `API trả về lỗi (${res.status}).`;
        } catch (_) {
          finalError = `Không gọi được ${request.url.replace(SERVER_URL, '')}.`;
        }
      }

      Alert.alert('Lỗi truyền cấu hình', finalError);
    } finally {
      setIsSetupSending(false);
    }
  };

  const startDriving = () => {
    const now = Date.now();
    setIsDriving(true);
    setSessionStartAt(now);
    setSessionElapsedMs(0);
    setDrowsyEvents(0);
  };

  const stopDriving = () => {
    const finalElapsedMs = sessionStartAt ? Date.now() - sessionStartAt : sessionElapsedMs;
    const finalSeconds = Math.floor(finalElapsedMs / 1000);

    setIsDriving(false);
    setSessionElapsedMs(finalElapsedMs);
    clearInterval(sessionClock.current);
    sessionClock.current = null;
    Vibration.cancel();
    Alert.alert('🏁 Kết thúc', `Thời gian: ${formatDuration(finalSeconds)}\nBuồn ngủ: ${drowsyEvents} lần`);
  };

  const fetchFullHistory = useCallback(async (showFeedback = false) => {
    if (!userId || !token) {
      if (showFeedback) Alert.alert('Thông báo', 'Bạn cần đăng nhập để tải dữ liệu.');
      return;
    }

    setHistoryLoading(true);
    setHistoryPage(1); // ✅ Reset trang
    try {
      const res = await fetch(`${SERVER_URL}/api/history/${userId}?page=1&limit=30`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (res.ok) {
        const { data, pagination } = json;
        setAllHistory(Array.isArray(data) ? data : []);
        setHistoryHasMore(pagination?.hasMore || false); // ✅ Lưu trạng thái hasMore
        setHistoryPage(1);
        setLastHistorySync(Date.now());
        
        // ✅ Cache vào AsyncStorage để offline access
        await AsyncStorage.setItem(
          `@history_${userId}`,
          JSON.stringify({ data, updatedAt: Date.now() })
        ).catch(() => {});
        
        if (showFeedback) Alert.alert('✅ Hoàn tất', 'Đã làm mới dữ liệu thành công.');
      } else if (showFeedback) {
        Alert.alert('❌ Lỗi', json?.error || 'Không tải được lịch sử dữ liệu.');
      }
    } catch (_) {
      // ✅ Fallback: Load từ cache nếu mạng bị lỗi
      try {
        const cached = await AsyncStorage.getItem(`@history_${userId}`);
        if (cached) {
          const { data } = JSON.parse(cached);
          setAllHistory(Array.isArray(data) ? data : []);
          if (showFeedback) Alert.alert('📱 Offline', 'Đang xem dữ liệu lưu trữ cục bộ.');
        }
      } catch (e) {}
      if (showFeedback) Alert.alert('❌ Lỗi mạng', 'Không kết nối được server để tải dữ liệu.');
    }
    finally { setHistoryLoading(false); }
  }, [userId, token]);

  // ✅ Hàm load thêm trang (infinite scroll)
  const loadMoreHistory = useCallback(async () => {
    if (!userId || !token || !historyHasMore || historyLoadingMore) return;

    const nextPage = historyPage + 1;
    setHistoryLoadingMore(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/history/${userId}?page=${nextPage}&limit=30`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (res.ok) {
        const { data, pagination } = json;
        setAllHistory(prev => [...prev, ...data]); // ✅ Merge trang mới
        setHistoryHasMore(pagination?.hasMore || false);
        setHistoryPage(nextPage);
      }
    } catch (_) {}
    finally { setHistoryLoadingMore(false); }
  }, [userId, token, historyHasMore, historyPage, historyLoadingMore]);

  const deleteDataInRange = async () => {
    if (!userId || !token) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập.');
      return;
    }

    setDeletingData(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/history/delete-range`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('✅ Thành công', `Đã xóa ${data.deletedCount} bản ghi`);
        // ✅ Reset pagination & reload
        setHistoryPage(1);
        setHistoryHasMore(true);
        fetchFullHistory(false);
      } else {
        Alert.alert('❌ Lỗi', data?.error || 'Lỗi xóa dữ liệu');
      }
    } catch (_) {
      Alert.alert('❌ Lỗi mạng', 'Không kết nối được server');
    } finally {
      setDeletingData(false);
    }
  };

  const handleLogout = () => {
    setScreen('Login');
    setPassword('');
    setUserId('');
    setUserFullName('');
    setToken(''); // ✅ Xóa token khi logout
    setIsDriving(false);
    setSessionStartAt(null);
    setSessionElapsedMs(0);
    clearInterval(sessionClock.current);
    sessionClock.current = null;
    Vibration.cancel();
    if (socketRef.current) socketRef.current.disconnect();
    AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
  };

  // --- Render Helpers ---
  const renderScreen = () => {
    switch (screen) {
      case 'Login':
        return <LoginScreen {...{ username, setUsername, password, setPassword, isLoading, handleLogin, setScreen }} />;
      case 'Register':
        return <RegisterScreen {...{ username, setUsername, password, setPassword, fullName, setFullName, isLoading, handleRegister, setScreen }} />;
      case 'Dashboard':
        return <DashboardScreen {...{
          userFullName, status, heartRate, spo2,
          deviceActive,
          historyData: allHistory,
          lastHistorySync,
          getHeartRateColor, getSpo2Color, getDrowsinessColor,
          isDrowsy, alertAnim, connectionStatus
        }} />;
      case 'DataManager':
        return <DataManagerScreen {...{
          deviceActive, handleDeviceToggle: (v) => setDeviceActive(v),
          startDate, endDate, showStartDatePicker, setShowStartDatePicker,
          showEndDatePicker, setShowEndDatePicker,
          handleStartDateChange: (e, d) => { setShowStartDatePicker(false); if(d) setStartDate(d); },
          handleEndDateChange: (e, d) => { setShowEndDatePicker(false); if(d) setEndDate(d); },
          deleteDataInRange,
          deletingData, allHistory, fetchFullHistory, historyLoading, lastHistorySync,
          loadMoreHistory, historyLoadingMore, historyHasMore // ✅ Thêm infinite scroll props
        }} />;
      case 'Settings':
        return <SettingsScreen {...{
          userFullName, username, userId, wifiSsid, setWifiSsid, wifiPassword, setWifiPassword,
          isSetupSending, handleLinkDevice, handleLogout
        }} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation */}
      {['Dashboard', 'DataManager', 'Settings'].includes(screen) && (
        <View style={navStyles.bar}>
          {[
            { id: 'Dashboard', icon: '🏠', label: 'Tổng quan' },
            { id: 'DataManager', icon: '🗂️', label: 'Dữ liệu & TK' },
            { id: 'Settings',  icon: '⚙️', label: 'Cài đặt' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={navStyles.item}
              onPress={() => { setScreen(tab.id); if (tab.id === 'DataManager' || tab.id === 'Dashboard') fetchFullHistory(false); }}
            >
              <Text style={[navStyles.icon, screen === tab.id && navStyles.iconActive]}>{tab.icon}</Text>
              <Text style={[navStyles.label, screen === tab.id && navStyles.labelActive]}>{tab.label}</Text>
              {screen === tab.id && <View style={navStyles.activePip} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
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
