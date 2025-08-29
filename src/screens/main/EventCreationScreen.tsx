import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaUpload } from '../../components/MediaUpload';

interface EventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  price: string;
  capacity: string;
  image: string | null;
}

const EventCreationScreen: React.FC = () => {
  const [formData, setFormData] = useState<EventForm>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: '',
    price: '',
    capacity: '',
    image: null,
  });

  const [activeStep, setActiveStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadedMediaAssets, setUploadedMediaAssets] = useState<any[]>([]);

  const categories = [
    'Music Festival',
    'Dance Party',
    'Art Exhibition',
    'Food Festival',
    'Comedy Show',
    'Sports Event',
    'Workshop',
    'Conference',
    'Other',
  ];

  const handleInputChange = (field: keyof EventForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = () => {
    setShowMediaUpload(true);
  };

  const handleMediaUploadComplete = (mediaAssets: any[]) => {
    setUploadedMediaAssets(mediaAssets);
    if (mediaAssets.length > 0) {
      setFormData(prev => ({ ...prev, image: mediaAssets[0].url }));
    }
    setShowMediaUpload(false);
  };

  const handleMediaUploadError = (error: string) => {
    Alert.alert('Upload Error', error);
    setShowMediaUpload(false);
  };

  const handleDateSelect = () => {
    // Here you would implement date picker
    Alert.alert('Date Picker', 'Date picker would open here');
  };

  const handleTimeSelect = () => {
    // Here you would implement time picker
    Alert.alert('Time Picker', 'Time picker would open here');
  };

  const handleLocationSelect = () => {
    // Here you would implement location picker
    Alert.alert('Location Picker', 'Location picker would open here');
  };

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
  };

  const handleNextStep = () => {
    if (activeStep < 3) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handlePublish = () => {
    Alert.alert(
      'Publish Event',
      'Are you sure you want to publish this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => console.log('Event published') },
      ]
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map(step => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            activeStep >= step && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepNumber,
              activeStep >= step && styles.stepNumberActive
            ]}>
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              activeStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      {/* Event Image */}
      <TouchableOpacity style={styles.imageUploadContainer} onPress={handleImageUpload}>
        {formData.image ? (
          <Image source={{ uri: formData.image }} style={styles.eventImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera" size={32} color="#a3a3a3" />
            <Text style={styles.imagePlaceholderText}>Add Event Image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Event Title */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Event Title *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter event title"
          placeholderTextColor="#a3a3a3"
          value={formData.title}
          onChangeText={(value) => handleInputChange('title', value)}
        />
      </View>

      {/* Event Description */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe your event..."
          placeholderTextColor="#a3a3a3"
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Category Selection */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                formData.category === category && styles.categoryChipActive
              ]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text style={[
                styles.categoryChipText,
                formData.category === category && styles.categoryChipTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderDateTimeLocation = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Date, Time & Location</Text>

      {/* Date Selection */}
      <TouchableOpacity style={styles.inputContainer} onPress={handleDateSelect}>
        <Text style={styles.inputLabel}>Date *</Text>
        <View style={styles.pickerContainer}>
          <Text style={[styles.textInput, styles.pickerText]}>
            {formData.date || 'Select date'}
          </Text>
          <Ionicons name="calendar" size={20} color="#a3a3a3" />
        </View>
      </TouchableOpacity>

      {/* Time Selection */}
      <TouchableOpacity style={styles.inputContainer} onPress={handleTimeSelect}>
        <Text style={styles.inputLabel}>Time *</Text>
        <View style={styles.pickerContainer}>
          <Text style={[styles.textInput, styles.pickerText]}>
            {formData.time || 'Select time'}
          </Text>
          <Ionicons name="time" size={20} color="#a3a3a3" />
        </View>
      </TouchableOpacity>

      {/* Location Selection */}
      <TouchableOpacity style={styles.inputContainer} onPress={handleLocationSelect}>
        <Text style={styles.inputLabel}>Location *</Text>
        <View style={styles.pickerContainer}>
          <Text style={[styles.textInput, styles.pickerText]}>
            {formData.location || 'Select location'}
          </Text>
          <Ionicons name="location" size={20} color="#a3a3a3" />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPricingCapacity = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pricing & Capacity</Text>

      {/* Price */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Price</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={[styles.textInput, styles.priceInput]}
            placeholder="0.00"
            placeholderTextColor="#a3a3a3"
            value={formData.price}
            onChangeText={(value) => handleInputChange('price', value)}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.inputHint}>Leave empty for free events</Text>
      </View>

      {/* Capacity */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Capacity</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter maximum capacity"
          placeholderTextColor="#a3a3a3"
          value={formData.capacity}
          onChangeText={(value) => handleInputChange('capacity', value)}
          keyboardType="numeric"
        />
        <Text style={styles.inputHint}>Leave empty for unlimited capacity</Text>
      </View>

      {/* Preview Button */}
      <TouchableOpacity 
        style={styles.previewButton}
        onPress={() => setShowPreview(true)}
      >
        <Ionicons name="eye" size={20} color="white" />
        <Text style={styles.previewButtonText}>Preview Event</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Event Preview</Text>
        <TouchableOpacity onPress={() => setShowPreview(false)}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.previewContent}>
        {formData.image && (
          <Image source={{ uri: formData.image }} style={styles.previewImage} />
        )}
        
        <View style={styles.previewInfo}>
          <Text style={styles.previewEventTitle}>{formData.title || 'Event Title'}</Text>
          <Text style={styles.previewEventDescription}>{formData.description || 'Event description...'}</Text>
          
          <View style={styles.previewDetails}>
            <View style={styles.previewDetail}>
              <Ionicons name="calendar" size={16} color="#00ff88" />
              <Text style={styles.previewDetailText}>{formData.date || 'Date TBD'}</Text>
            </View>
            
            <View style={styles.previewDetail}>
              <Ionicons name="time" size={16} color="#00ff88" />
              <Text style={styles.previewDetailText}>{formData.time || 'Time TBD'}</Text>
            </View>
            
            <View style={styles.previewDetail}>
              <Ionicons name="location" size={16} color="#00ff88" />
              <Text style={styles.previewDetailText}>{formData.location || 'Location TBD'}</Text>
            </View>
            
            {formData.price && (
              <View style={styles.previewDetail}>
                <Ionicons name="card" size={16} color="#00ff88" />
                <Text style={styles.previewDetailText}>${formData.price}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity 
          style={[styles.publishButton, formData.title && styles.publishButtonActive]}
          onPress={handlePublish}
          disabled={!formData.title}
        >
          <Text style={[styles.publishButtonText, formData.title && styles.publishButtonTextActive]}>
            Publish
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeStep === 1 && renderBasicInfo()}
        {activeStep === 2 && renderDateTimeLocation()}
        {activeStep === 3 && renderPricingCapacity()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {activeStep > 1 && (
          <TouchableOpacity style={styles.navButton} onPress={handlePreviousStep}>
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        {activeStep < 3 && (
          <TouchableOpacity 
            style={[styles.navButton, styles.nextButton]} 
            onPress={handleNextStep}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Preview Modal */}
      {showPreview && (
        <View style={styles.modalOverlay}>
          {renderPreview()}
        </View>
      )}

      {/* Media Upload Modal */}
      <Modal
        visible={showMediaUpload}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMediaUpload(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Upload Event Image</Text>
            <View style={styles.placeholder} />
          </View>
          <MediaUpload
            contextType="event"
            contextId="temp-event-id"
            mediaType="image"
            maxFiles={1}
            onUploadComplete={handleMediaUploadComplete}
            onUploadError={handleMediaUploadError}
            style={styles.mediaUploadContainer}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  publishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#333333',
  },
  publishButtonActive: {
    backgroundColor: '#00ff88',
  },
  publishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  publishButtonTextActive: {
    color: '#1a1a1a',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#00ff88',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a3a3a3',
  },
  stepNumberActive: {
    color: '#1a1a1a',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#333333',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#00ff88',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
  },
  imageUploadContainer: {
    marginBottom: 24,
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#262626',
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#a3a3a3',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#333333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#333333',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  categoryChipTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  pickerText: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  currencySymbol: {
    fontSize: 16,
    color: 'white',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  inputHint: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 4,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff88',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#333333',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  nextButton: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  previewContent: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  previewInfo: {
    padding: 16,
  },
  previewEventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  previewEventDescription: {
    fontSize: 16,
    color: '#a3a3a3',
    marginBottom: 16,
    lineHeight: 24,
  },
  previewDetails: {
    gap: 12,
  },
  previewDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewDetailText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  mediaUploadContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default EventCreationScreen;
