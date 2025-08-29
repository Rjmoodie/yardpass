import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button } from '../../components/common/Button';
import { lightTheme, typography } from '../../constants/theme';
import { RootStackParamList } from '../../types';

type PassesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

export const PassesScreen: React.FC = () => {
  const navigation = useNavigation<PassesScreenNavigationProp>();

  const mockPasses = [
    { id: '1', title: 'Construction Site Access', status: 'active' },
    { id: '2', title: 'Maintenance Visit', status: 'expired' },
    { id: '3', title: 'Delivery Pass', status: 'pending' },
  ];

  const renderPass = ({ item }: { item: any }) => (
    <View style={styles.passItem}>
      <Text style={styles.passTitle}>{item.title}</Text>
      <Text style={[styles.passStatus, styles[item.status]]}>
        {item.status.toUpperCase()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Passes</Text>
        <Button
          title="Create Pass"
          onPress={() => navigation.navigate('CreatePass' as any)}
          size="small"
        />
      </View>
      
      <FlatList
        data={mockPasses}
        renderItem={renderPass}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: lightTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600' as const,
    color: lightTheme.colors.text,
  },
  list: {
    padding: lightTheme.spacing.lg,
  },
  passItem: {
    backgroundColor: lightTheme.colors.surface,
    padding: lightTheme.spacing.md,
    borderRadius: lightTheme.borderRadius.md,
    marginBottom: lightTheme.spacing.md,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
  },
  passTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '500' as const,
    color: lightTheme.colors.text,
    marginBottom: lightTheme.spacing.xs,
  },
  passStatus: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  active: {
    color: lightTheme.colors.success,
  },
  expired: {
    color: lightTheme.colors.error,
  },
  pending: {
    color: lightTheme.colors.warning,
  },
});
