import React, { useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, Animated, Dimensions
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { C } from '../constants/theme';

const screenWidth = Dimensions.get("window").width;

export const StyledInput = ({ placeholder, value, onChangeText, secureTextEntry, icon }) => (
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

export const PulseRing = ({ active, color }) => {
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

export const MetricCard = ({ emoji, label, value, unit, color, subtext }) => (
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

export const MiniChart = ({ data, labels, color, title, unit }) => {
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
