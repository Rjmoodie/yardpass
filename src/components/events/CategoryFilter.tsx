import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../constants/theme';
import { apiGateway } from '../../services/api';
import { EventCategoryData } from '../../types';

interface CategoryFilterProps {
  selectedCategory?: string;
  onCategorySelect: (categoryId: string | null) => void;
  showAllOption?: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategorySelect,
  showAllOption = true,
}) => {
  const [categories, setCategories] = useState<EventCategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await apiGateway.getReferenceData({ type: 'event_categories' });
      
      if (response.error) {
        console.error('Error loading categories:', response.error.message);
        return;
      }
      
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {showAllOption && (
        <TouchableOpacity
          style={[
            styles.categoryButton,
            !selectedCategory && styles.selectedButton,
          ]}
          onPress={() => onCategorySelect(null)}
        >
          <Text
            style={[
              styles.categoryText,
              !selectedCategory && styles.selectedText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      )}

      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryButton,
            selectedCategory === category.id && styles.selectedButton,
          ]}
          onPress={() => onCategorySelect(category.id)}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === category.id && styles.selectedText,
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: theme.typography.caption.fontWeight as any,
    color: theme.colors.text,
  },
  selectedText: {
    color: theme.colors.background,
  },
});
