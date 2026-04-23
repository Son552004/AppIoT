/**
 * 🏥 HEALTH DATA MANAGER - APP REACT NATIVE
 * Giao diện quản lý lịch sử dữ liệu, xóa dữ liệu, và điều khiển thiết bị
 * 
 * Tính năng:
 * ✅ Xem lịch sử 100 bản ghi gần nhất
 * ✅ Xóa dữ liệu theo khoảng thời gian
 * ✅ Công tắc Sleep/Wakeup để tiết kiệm pin
 * ✅ Hiển thị trạng thái thiết bị
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Switch,
    FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE_URL = 'http://your-render-server.onrender.com/api'; // 🔄 Thay bằng URL Server của bạn

const HealthDataManager = ({ userId }) => {
    // ==========================================
    // STATE MANAGEMENT
    // ==========================================
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deviceActive, setDeviceActive] = useState(true);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [deletingData, setDeletingData] = useState(false);

    // ==========================================
    // 📥 FUNCTION: Lấy lịch sử dữ liệu
    // ==========================================
    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/history/${userId}`);
            const data = await response.json();
            setHistory(data);
            console.log('✅ Đã lấy lịch sử:', data.length, 'bản ghi');
        } catch (error) {
            Alert.alert('❌ Lỗi', 'Không thể lấy lịch sử dữ liệu');
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 🗑️ FUNCTION: Xóa dữ liệu theo khoảng thời gian
    // ==========================================
    const deleteDataInRange = async () => {
        if (startDate > endDate) {
            Alert.alert('⚠️ Lỗi', 'Ngày bắt đầu phải trước ngày kết thúc!');
            return;
        }

        Alert.alert(
            '⚠️ Xác nhận',
            `Xóa dữ liệu từ ${startDate.toLocaleDateString()} đến ${endDate.toLocaleDateString()}?`,
            [
                {
                    text: 'Hủy',
                    onPress: () => console.log('Đã hủy xóa'),
                    style: 'cancel',
                },
                {
                    text: 'Xóa',
                    onPress: async () => {
                        try {
                            setDeletingData(true);
                            const response = await fetch(`${API_BASE_URL}/history/delete-range`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: userId,
                                    startDate: startDate.toISOString(),
                                    endDate: endDate.toISOString(),
                                }),
                            });
                            const result = await response.json();
                            Alert.alert(
                                '✅ Thành công',
                                `Đã xóa ${result.deletedCount} bản ghi`
                            );
                            fetchHistory(); // Tải lại lịch sử
                        } catch (error) {
                            Alert.alert('❌ Lỗi', 'Không thể xóa dữ liệu');
                            console.error('Error deleting data:', error);
                        } finally {
                            setDeletingData(false);
                        }
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    // ==========================================
    // 💤 FUNCTION: Gửi lệnh SLEEP/WAKEUP
    // ==========================================
    const sendDeviceCommand = async (command) => {
        try {
            const response = await fetch(`${API_BASE_URL}/device/control`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command }),
            });
            const result = await response.json();
            if (result.success) {
                Alert.alert('✅ Thành công', result.message);
            } else {
                Alert.alert('❌ Lỗi', result.error);
            }
        } catch (error) {
            Alert.alert('❌ Lỗi', 'Không thể gửi lệnh tới thiết bị');
            console.error('Error sending command:', error);
        }
    };

    // ==========================================
    // 🔄 FUNCTION: Xử lý thay đổi công tắc Sleep/Wakeup
    // ==========================================
    const handleDeviceToggle = (value) => {
        setDeviceActive(value);
        const command = value ? 'WAKEUP' : 'SLEEP';
        sendDeviceCommand(command);
    };

    // ==========================================
    // 📅 XỬ LÝ CHỌN NGÀY
    // ==========================================
    const handleStartDateChange = (event, selectedDate) => {
        setShowStartDatePicker(false);
        if (selectedDate) setStartDate(selectedDate);
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndDatePicker(false);
        if (selectedDate) setEndDate(selectedDate);
    };

    // Load lịch sử khi component được mount
    useEffect(() => {
        fetchHistory();
    }, [userId]);

    // ==========================================
    // 📊 RENDER: Item trong danh sách lịch sử
    // ==========================================
    const renderHistoryItem = ({ item }) => {
        const timeStr = new Date(item.timestamp).toLocaleString('vi-VN');
        return (
            <View style={styles.historyItem}>
                <View style={styles.historyItemLeft}>
                    <Text style={styles.historyTime}>{timeStr}</Text>
                    <View style={styles.historyValues}>
                        <Text style={styles.historyValue}>❤️ BPM: {item.bpm}</Text>
                        <Text style={styles.historyValue}>🩸 SpO2: {item.spo2}%</Text>
                    </View>
                </View>
                <View style={[
                    styles.drowsinessIndicator,
                    { backgroundColor: item.isDrowsy ? '#FF6B6B' : '#4CAF50' }
                ]}>
                    <Text style={styles.drowsinessText}>
                        {item.isDrowsy ? '😴' : '👁️'}
                    </Text>
                </View>
            </View>
        );
    };

    // ==========================================
    // 🎨 RENDER: GIAO DIỆN CHÍNH
    // ==========================================
    return (
        <ScrollView style={styles.container}>
            {/* 📌 HEADER */}
            <Text style={styles.header}>🏥 Quản lý Y Tế</Text>

            {/* 💤 CÔNG TẮC SLEEP/WAKEUP */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💤 Trạng thái Thiết bị</Text>
                <View style={styles.deviceControl}>
                    <View style={styles.deviceStatus}>
                        <Text style={styles.statusLabel}>Thiết bị:</Text>
                        <Text style={[
                            styles.statusValue,
                            { color: deviceActive ? '#4CAF50' : '#FF6B6B' }
                        ]}>
                            {deviceActive ? '☀️ Hoạt động' : '💤 Ngủ đông'}
                        </Text>
                    </View>
                    <Switch
                        value={deviceActive}
                        onValueChange={handleDeviceToggle}
                        trackColor={{ false: '#FF6B6B', true: '#4CAF50' }}
                        thumbColor={deviceActive ? '#fff' : '#fff'}
                    />
                </View>
                <Text style={styles.hint}>
                    Tắt thiết bị để tiết kiệm pin. Đèn LED trên cảm biến sẽ tắt.
                </Text>
            </View>

            {/* 📅 CHỌN NGÀY & XÓA DỮ LIỆU */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🗑️ Xóa dữ liệu theo khoảng thời gian</Text>

                {/* Chọn ngày bắt đầu */}
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                >
                    <Text style={styles.dateButtonText}>
                        📅 Từ ngày: {startDate.toLocaleDateString('vi-VN')}
                    </Text>
                </TouchableOpacity>
                {showStartDatePicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={handleStartDateChange}
                    />
                )}

                {/* Chọn ngày kết thúc */}
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                >
                    <Text style={styles.dateButtonText}>
                        📅 Đến ngày: {endDate.toLocaleDateString('vi-VN')}
                    </Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={handleEndDateChange}
                    />
                )}

                {/* Nút Xóa */}
                <TouchableOpacity
                    style={[styles.deleteButton, deletingData && { opacity: 0.5 }]}
                    onPress={deleteDataInRange}
                    disabled={deletingData}
                >
                    {deletingData ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.deleteButtonText}>🗑️ Xóa dữ liệu</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* 📊 LỊCH SỬ DỮ LIỆU */}
            <View style={styles.section}>
                <View style={styles.historyHeader}>
                    <Text style={styles.sectionTitle}>📊 Lịch sử ({history.length} bản ghi)</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={fetchHistory}
                        disabled={loading}
                    >
                        <Text style={styles.refreshButtonText}>🔄</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
                ) : history.length > 0 ? (
                    <FlatList
                        data={history}
                        keyExtractor={(item) => item._id}
                        renderItem={renderHistoryItem}
                        scrollEnabled={false}
                    />
                ) : (
                    <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
                )}
            </View>
        </ScrollView>
    );
};

// ==========================================
// 🎨 STYLESHEET
// ==========================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 15,
        paddingTop: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    deviceControl: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    deviceStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 10,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginTop: 10,
        fontStyle: 'italic',
    },
    dateButton: {
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    dateButtonText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    deleteButton: {
        backgroundColor: '#FF6B6B',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    refreshButton: {
        backgroundColor: '#2196F3',
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshButtonText: {
        fontSize: 16,
    },
    loader: {
        marginVertical: 20,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fafafa',
        borderRadius: 8,
        marginBottom: 8,
    },
    historyItemLeft: {
        flex: 1,
    },
    historyTime: {
        fontSize: 12,
        color: '#999',
        marginBottom: 6,
    },
    historyValues: {
        flexDirection: 'row',
    },
    historyValue: {
        fontSize: 13,
        color: '#333',
        marginRight: 12,
        fontWeight: '500',
    },
    drowsinessIndicator: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drowsinessText: {
        fontSize: 20,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingVertical: 20,
    },
});

export default HealthDataManager;
