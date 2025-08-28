import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Recommendation } from '@/services/smartServices';
import RecommendationCard from './RecommendationCard';

interface SmartFeedSectionProps {
  title: string;
  recommendations: Recommendation[];
  onRecommendationPress: (recommendation: Recommendation) => void;
}

const SmartFeedSection: React.FC<SmartFeedSectionProps> = ({
  title,
  recommendations,
  onRecommendationPress,
}) => {
  const renderRecommendation = ({ item }: { item: Recommendation }) => (
    <RecommendationCard
      recommendation={item}
      onPress={onRecommendationPress}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={recommendations}
        renderItem={renderRecommendation}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
});

export default SmartFeedSection;
