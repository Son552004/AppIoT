import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import io from 'socket.io-client';
import { LineChart } from 'react-native-chart-kit'; // Thêm thư viện biểu đồ

// ⚠️ NHỚ GIỮ NGUYÊN IP MÁY TÍNH CỦA BẠN NHÉ
const SERVER_URL = 'http://192.168.100.235:3000';
const screenWidth = Dimensions.get("window").width; // Lấy chiều rộng màn hình

// Component Nhập liệu
const InputField = ({ placeholder, value, onChangeText, secureTextEntry, autoCapitalize = "none" }) => (
  <TextInput style={styles.input} placeholder={placeholder} value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} autoCapitalize={autoCapitalize} />
);

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userId, setUserId] = useState('');
  const [userFullName, setUserFullName] = useState('');

  const [heartRate, setHeartRate] = useState(0);
  const [spo2, setSpo2] = useState(0);
  const [status, setStatus] = useState("Đang kết nối Server...");
  const [historyData, setHistoryData] = useState([]);

  const fetchHistory = async (uid) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/data/${uid}`);
      const data = await response.json();
      if (response.ok) setHistoryData(data);
    } catch (error) { console.log("Lỗi tải lịch sử"); }
  };

  const handleRegister = async () => {
    if (!username || !password || !fullName) return Alert.alert("Lỗi", "Nhập đủ thông tin.");
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, fullName })
      });
      if (response.ok) {
        Alert.alert("Thành công", "Hãy đăng nhập.");
        setCurrentScreen('Login'); setPassword('');
      } else Alert.alert("Lỗi", (await response.json()).error);
    } catch (error) { Alert.alert("Lỗi kết nối", "Không tìm thấy Server."); } finally { setIsLoading(false); }
  };

  const handleLogin = async () => {
    if (!username || !password) return Alert.alert("Lỗi", "Nhập đủ thông tin.");
    setIsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        setUserFullName(data.fullName); setUserId(data.userId);
        fetchHistory(data.userId); setCurrentScreen('Dashboard');
      } else Alert.alert("Lỗi", data.error);
    } catch (error) { Alert.alert("Lỗi kết nối", "Không tìm thấy Server."); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    let socket;
    if (currentScreen === 'Dashboard') {
      socket = io(SERVER_URL);
      socket.on('connect', () => setStatus("Sẵn sàng. Chờ dữ liệu..."));
      socket.on('health_update', (data) => {
        setHeartRate(data.heartRate); setSpo2(data.spo2); setStatus(data.drowsinessStatus);
        if(userId) fetchHistory(userId);
      });
    }
    return () => { if (socket) socket.disconnect(); };
  }, [currentScreen, userId]);

  // CHUẨN BỊ DỮ LIỆU CHO BIỂU ĐỒ (Phải đảo ngược mảng để thời gian chạy từ trái sang phải)
  const chartDataArray = [...historyData].reverse();
  const chartLabels = chartDataArray.length > 0 ? chartDataArray.map(item => {
    const d = new Date(item.timestamp);
    return `${d.getHours()}:${d.getMinutes() < 10 ? '0' : ''}${d.getMinutes()}`;
  }) : ['00:00'];
  const bpmData = chartDataArray.length > 0 ? chartDataArray.map(item => item.bpm || 0) : [0];
  const spo2ChartData = chartDataArray.length > 0 ? chartDataArray.map(item => item.spo2 || 0) : [0];

  // ========================== GIAO DIỆN ==========================
  if (currentScreen === 'Login') {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.headerTitle}>Hệ Thống Y Tế IoT</Text>
        <Text style={styles.subTitle}>Đăng Nhập</Text>
        <InputField placeholder="Tên đăng nhập" value={username} onChangeText={setUsername} />
        <InputField placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry={true} />
        {isLoading ? <ActivityIndicator size="large" color="#007bff" /> : (
          <TouchableOpacity style={styles.button} onPress={handleLogin}><Text style={styles.buttonText}>ĐĂNG NHẬP</Text></TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setCurrentScreen('Register')} style={{marginTop: 20}}>
          <Text style={styles.linkText}>Chưa có tài khoản? Đăng ký</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentScreen === 'Register') {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.headerTitle}>Hệ Thống Y Tế IoT</Text><Text style={styles.subTitle}>Đăng Ký</Text>
        <InputField placeholder="Họ và tên" value={fullName} onChangeText={setFullName} />
        <InputField placeholder="Tên đăng nhập" value={username} onChangeText={setUsername} />
        <InputField placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry={true} />
        {isLoading ? <ActivityIndicator size="large" color="#28a745" /> : (
          <TouchableOpacity style={[styles.button, {backgroundColor: '#28a745'}]} onPress={handleRegister}><Text style={styles.buttonText}>TẠO TÀI KHOẢN</Text></TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setCurrentScreen('Login')} style={{marginTop: 20}}>
          <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>Xin chào, {userFullName}</Text>

        {/* Số liệu Real-time */}
        <View style={[styles.statusBox, { backgroundColor: status === "Tỉnh táo" ? '#d4edda' : (status === "Buồn ngủ" ? '#fff3cd' : '#f8d7da') }]}>
          <Text style={styles.label}>Trạng thái AI:</Text>
          <Text style={[styles.statusValue, { color: status === "Tỉnh táo" ? '#155724' : (status === "Buồn ngủ" ? '#856404' : '#721c24') }]}>{status.toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.card}><Text style={styles.cardEmoji}>❤️</Text><Text style={styles.cardLabel}>Nhịp tim</Text><Text style={styles.cardValue}>{heartRate}</Text><Text style={styles.cardUnit}>bpm</Text></View>
          <View style={styles.card}><Text style={styles.cardEmoji}>🩸</Text><Text style={styles.cardLabel}>SpO2</Text><Text style={styles.cardValue}>{spo2}</Text><Text style={styles.cardUnit}>%</Text></View>
        </View>

        {/* BIỂU ĐỒ LINE CHART */}
        <Text style={styles.sectionTitle}>Biểu đồ Xu hướng</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={{
              labels: chartLabels,
              datasets: [
                { data: bpmData, color: (opacity = 1) => `rgba(220, 53, 69, ${opacity})`, strokeWidth: 2 }, // Đỏ cho Nhịp tim
                { data: spo2ChartData, color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`, strokeWidth: 2 } // Xanh cho SpO2
              ],
              legend: ["Nhịp tim", "SpO2"]
            }}
            width={screenWidth - 40} // Độ rộng trừ đi padding 2 bên
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Màu đường lưới
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`, // Màu chữ
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#ffa726" }
            }}
            bezier // Làm cong đường nối cho mượt
            style={{ borderRadius: 16 }}
          />
        </View>

        {/* Danh sách Dữ liệu Cũ */}
        <Text style={styles.sectionTitle}>Lịch sử đo</Text>
        {historyData.length === 0 ? (
          <Text style={{textAlign: 'center', color: '#888', marginTop: 10}}>Chưa có dữ liệu nào.</Text>
        ) : (
          historyData.map((item, index) => {
            const dateObj = new Date(item.timestamp);
            return (
              <View key={index} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyTime}>{`${dateObj.getHours()}:${dateObj.getMinutes() < 10 ? '0' : ''}${dateObj.getMinutes()}`}</Text>
                  <Text style={styles.historyDate}>{`${dateObj.getDate()}/${dateObj.getMonth() + 1}`}</Text>
                </View>
                <View style={styles.historyDataContainer}>
                  <Text style={styles.historyText}>❤️ {item.bpm} bpm</Text>
                  <Text style={styles.historyText}>🩸 {item.spo2}%</Text>
                </View>
                <View><Text style={[styles.historyText, { color: item.isDrowsy ? '#dc3545' : '#28a745', fontWeight: 'bold' }]}>{item.isDrowsy ? "Buồn ngủ" : "Tỉnh táo"}</Text></View>
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={() => setCurrentScreen('Login')}><Text style={styles.buttonText}>ĐĂNG XUẤT</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 5, color: '#333' },
  subTitle: { fontSize: 18, textAlign: 'center', marginBottom: 30, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#007bff', textAlign: 'center', fontSize: 14 },
  scrollContainer: { padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  statusBox: { padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  label: { fontSize: 14, color: '#666' },
  statusValue: { fontSize: 22, fontWeight: '900', marginTop: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardEmoji: { fontSize: 30, marginBottom: 10 },
  cardLabel: { fontSize: 14, color: '#888' },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#222' },
  cardUnit: { fontSize: 14, color: '#888' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 30, marginBottom: 15, color: '#333' },
  chartWrapper: { backgroundColor: '#fff', borderRadius: 16, padding: 5, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, alignItems: 'center' },
  historyRow: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  historyTime: { fontSize: 16, fontWeight: 'bold', color: '#007bff' },
  historyDate: { fontSize: 12, color: '#888' },
  historyDataContainer: { alignItems: 'center' },
  historyText: { fontSize: 14, color: '#444', marginVertical: 2 },
  logoutButton: { backgroundColor: '#dc3545', padding: 15, borderRadius: 10, marginTop: 40, alignItems: 'center', marginBottom: 30 }
});

export default App;