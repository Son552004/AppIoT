# 🏥 HƯỚNG DẪN TÍCH HỢP - HEALTH DATA MANAGER

## 📋 Mô tả
File `HealthDataManager.js` cung cấp giao diện hoàn chỉnh để:
- ✅ Xem 100 bản ghi lịch sử gần nhất
- ✅ Xóa dữ liệu trong khoảng thời gian bất kỳ
- ✅ Điều khiển chế độ Sleep/Wakeup của thiết bị
- ✅ Xem trạng thái hoạt động của thiết bị

---

## 🔧 CÀI ĐẶT THƯ VIỆN

Trước tiên, cài đặt thư viện chọn ngày tháng:

```bash
npm install @react-native-community/datetimepicker
# hoặc
yarn add @react-native-community/datetimepicker
```

---

## 📱 CÁCH SỬ DỤNG

### 1. Import Component vào App

```javascript
// Ở file App.js hoặc tệp điều hướng chính của bạn
import HealthDataManager from './HealthDataManager';

export default function App() {
    const userId = 'USER_ID_CỦA_BẠN'; // Lấy từ localStorage hoặc AsyncStorage

    return (
        <HealthDataManager userId={userId} />
    );
}
```

### 2. Cập nhật URL Server

Tìm dòng này trong `HealthDataManager.js`:
```javascript
const API_BASE_URL = 'http://your-render-server.onrender.com/api';
```

Thay bằng URL thực tế của Server Render của bạn, ví dụ:
```javascript
const API_BASE_URL = 'https://health-iot-server.onrender.com/api';
```

---

## 🎯 TÍNH NĂNG CHI TIẾT

### 💤 Công tắc Sleep/Wakeup
- **Bật (Hoạt động)**: Thiết bị đang đo nhịp tim, mức SpO2
- **Tắt (Ngủ đông)**: Đèn LED tắt, tiết kiệm pin, không đo dữ liệu
- Công tắc sẽ gửi lệnh `SLEEP` hoặc `WAKEUP` tới Server → ESP32

### 📅 Xóa Dữ Liệu
1. Chọn ngày bắt đầu (nút "Từ ngày")
2. Chọn ngày kết thúc (nút "Đến ngày")
3. Bấm nút "🗑️ Xóa dữ liệu"
4. Xác nhận trong cửa sổ popup
5. Dữ liệu trong khoảng thời gian sẽ bị xóa khỏi Database

### 📊 Lịch Sử
- Hiển thị các bản ghi mới nhất lên đầu
- Bấm nút 🔄 để làm tươi dữ liệu
- Mỗi bản ghi hiển thị:
  - ⏰ Thời gian
  - ❤️ Nhịp tim (BPM)
  - 🩸 Mức oxy trong máu (SpO2)
  - 😴 Trạng thái buồn ngủ/Tỉnh táo

---

## 🔗 API ENDPOINTS ĐÃ CHUẨN BỊ SỴN SÀNG

Tất cả API này đã được thêm vào Server Node.js:

```javascript
// 1. Lấy lịch sử
GET /api/history/:userId
Response: [ { _id, userId, bpm, spo2, isDrowsy, timestamp }, ... ]

// 2. Xóa dữ liệu
DELETE /api/history/delete-range
Body: { userId, startDate, endDate }
Response: { success, deletedCount }

// 3. Gửi lệnh tới thiết bị
POST /api/device/control
Body: { command: "SLEEP" | "WAKEUP" | "RESTART" }
Response: { success, message }
```

---

## 🛠️ TUỲ CHỈNH GIAO DIỆN

### Đổi màu sắc
Chỉnh sửa phần `styles` ở cuối file:
```javascript
const styles = StyleSheet.create({
    deleteButton: {
        backgroundColor: '#FF6B6B', // 🔴 Đổi màu xóa
        // ...
    },
    // ...
});
```

### Đổi số lượng bản ghi tối đa
Trong hàm `fetchHistory()`:
```javascript
const data = await response.json();
const data = await response.json().slice(0, 50); // Chỉ lấy 50 bản ghi
```

---

## ⚠️ TROUBLESHOOTING

### ❌ Lỗi "Cannot find module '@react-native-community/datetimepicker'"
```bash
npm install @react-native-community/datetimepicker --save
```

### ❌ Lỗi "API Request Failed"
- Kiểm tra URL Server có chính xác không
- Kiểm tra iOS/Android Emulator có thể truy cập URL không
- Kiểm tra Server có đang chạy không (trên Render)

### ❌ Lỗi "userId is undefined"
- Đảm bảo bạn truyền `userId` prop vào component
- Kiểm tra userId có được lưu từ login không

### ❌ Công tắc không hoạt động
- Kiểm tra Server MQTT connection có kết nối không
- Kiểm tra ESP32 có subscribe topic `HealthData_Command_2026` không

---

## 📝 VÍ DỤ TÍCH HỢP ĐẦY ĐỦ

```javascript
// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HealthDataManager from './screens/HealthDataManager';
import LoginScreen from './screens/LoginScreen';

const Stack = createNativeStackNavigator();

export default function App() {
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lấy userId từ lưu trữ
        AsyncStorage.getItem('userId').then((id) => {
            if (id) setUserId(id);
            setLoading(false);
        });
    }, []);

    if (loading) return null;

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {!userId ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <Stack.Screen 
                        name="Manager" 
                        children={() => <HealthDataManager userId={userId} />}
                    />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
```

---

## 🎉 HOÀN THÀNH!

Bạn đã có:
- ✅ Server Node.js với 3 API mới
- ✅ ESP32 hỗ trợ SLEEP/WAKEUP
- ✅ App React Native với giao diện quản lý đầy đủ

Đây là một **sản phẩm thương mại hoàn chỉnh** cho thiết bị Y tế thông minh! 🏥

---

*Tạo ngày: April 23, 2026*
