import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/integrations/supabase/client';
import { useNavigation } from '@react-navigation/native';

interface EventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  city: string;
  category: string;
  price: string;
  capacity: string;
  image: string | null;
  visibility: 'public' | 'private';
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval: number;
  recurrenceDays: number[];
  endDate: string | null;
  endOccurrences: number | null;
}

interface Template {
  id: string;
  name: string;
  description: string;
  usage_count: number;
  template_data: any;
}

const EnhancedEventCreationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState<EventForm>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    venue: '',
    city: '',
    category: '',
    price: '',
    capacity: '',
    image: null,
    visibility: 'public',
    isRecurring: false,
    recurrenceType: 'weekly',
    recurrenceInterval: 1,
    recurrenceDays: [],
    endDate: null,
    endOccurrences: null,
  });

  const [activeStep, setActiveStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

  const recurrenceOptions = [
    { value: 'daily', label: 'Daily', icon: '📅' },
    { value: 'weekly', label: 'Weekly', icon: '📆' },
    { value: 'monthly', label: 'Monthly', icon: '🗓️' },
    { value: 'yearly', label: 'Yearly', icon: '📅' }
  ];

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const steps = [
    { id: 'basic-info', title: 'Basic Info', icon: '📝' },
    { id: 'location', title: 'Location', icon: '📍' },
    { id: 'date-time', title: 'Date & Time', icon: '📅' },
    { id: 'media', title: 'Media', icon: '🖼️' },
    { id: 'tickets', title: 'Tickets', icon: '🎫' },
    { id: 'settings', title: 'Settings', icon: '⚙️' },
    { id: 'summary', title: 'Summary', icon: '📋' }
  ];

  // Load draft on component mount
  useEffect(() => {
    loadDraft();
    loadTemplates();
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.title || formData.description) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData]);

  const loadDraft = async () => {
    try {
      const { data, error } = await supabase.rpc('load_event_draft');
      if (!error && data && Object.keys(data).length > 0) {
        setFormData(prev => ({ ...prev, ...data }));
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      const draftData = {
        title: formData.title,
        description: formData.description,
        venue: formData.venue,
        city: formData.city,
        category: formData.category,
        capacity: formData.capacity,
        price: formData.price,
        visibility: formData.visibility,
        isRecurring: formData.isRecurring,
        recurrenceType: formData.recurrenceType,
        recurrenceInterval: formData.recurrenceInterval,
        recurrenceDays: formData.recurrenceDays,
        endDate: formData.endDate,
        endOccurrences: formData.endOccurrences,
      };

      await supabase.rpc('save_event_draft', { draft_data: draftData });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();

      if (!error) {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const useTemplate = async (templateId: string) => {
    try {
      const { data, error } = await supabase.rpc('create_event_from_template', {
        template_id: templateId
      });

      if (!error && data) {
        setFormData(prev => ({ ...prev, ...data }));
        setShowTemplateModal(false);
        Alert.alert('Success', 'Template loaded successfully!');
      }
    } catch (error) {
      console.error('Error using template:', error);
      Alert.alert('Error', 'Failed to load template');
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    try {
      const templateData = {
        title: formData.title,
        description: formData.description,
        venue: formData.venue,
        city: formData.city,
        category: formData.category,
        capacity: formData.capacity,
        price: formData.price,
        visibility: formData.visibility,
        isRecurring: formData.isRecurring,
        recurrenceType: formData.recurrenceType,
        recurrenceInterval: formData.recurrenceInterval,
        recurrenceDays: formData.recurrenceDays,
      };

      const { error } = await supabase
        .from('event_templates')
        .insert({
          name: templateName,
          description: templateDescription,
          template_data: templateData,
          is_public: false
        })
        .execute();

      if (!error) {
        setShowSaveTemplateModal(false);
        setTemplateName('');
        setTemplateDescription('');
        loadTemplates();
        Alert.alert('Success', 'Template saved successfully!');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleInputChange = (field: keyof EventForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = () => {
    Alert.alert('Image Upload', 'Image picker would open here');
  };

  const handleDateSelect = () => {
    Alert.alert('Date Picker', 'Date picker would open here');
  };

  const handleTimeSelect = () => {
    Alert.alert('Time Picker', 'Time picker would open here');
  };

  const handleLocationSelect = () => {
    Alert.alert('Location Picker', 'Location picker would open here');
  };

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
  };

  const handleRecurringToggle = (value: boolean) => {
    setFormData(prev => ({ ...prev, isRecurring: value }));
  };

  const handleRecurrenceTypeChange = (type: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setFormData(prev => ({ 
      ...prev, 
      recurrenceType: type,
      recurrenceDays: type === 'weekly' ? prev.recurrenceDays : []
    }));
  };

  const handleDayToggle = (dayValue: number) => {
    setFormData(prev => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(dayValue)
        ? prev.recurrenceDays.filter(d => d !== dayValue)
        : [...prev.recurrenceDays, dayValue]
    }));
  };

  const navigateToStep = (stepIndex: number) => {
    setActiveStep(stepIndex);
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.venue || !formData.city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const eventData = {
        event_id: null, // Will be created
        publish_data: {
          title: formData.title,
          description: formData.description,
          slug: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          venue: formData.venue,
          city: formData.city,
          start_at: `${formData.date}T${formData.time}:00Z`,
          end_at: `${formData.date}T${formData.time}:00Z`,
          visibility: formData.visibility,
          category: formData.category,
          cover_image_url: formData.image,
          capacity: parseInt(formData.capacity) || null,
          waitlist_enabled: false,
          tags: [],
          settings: {
            isRecurring: formData.isRecurring,
            recurrenceType: formData.recurrenceType,
            recurrenceInterval: formData.recurrenceInterval,
            recurrenceDays: formData.recurrenceDays,
            endDate: formData.endDate,
            endOccurrences: formData.endOccurrences,
          }
        }
      };

      const { data, error } = await supabase.functions.invoke('publish-event', {
        body: eventData
      });

      if (error) throw error;

      Alert.alert('Success', 'Event published successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error publishing event:', error);
      Alert.alert('Error', 'Failed to publish event');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <TouchableOpacity
          key={step.id}
          style={styles.stepContainer}
          onPress={() => navigateToStep(index + 1)}
        >
          <View style={[
            styles.stepCircle,
            activeStep >= (index + 1) && styles.stepCircleActive
          ]}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
          </View>
                          <Text style={[
                  styles.stepTitleSmall,
                  activeStep >= (index + 1) && styles.stepTitleActive
                ]}>
            {step.title}
          </Text>
          {index < steps.length - 1 && (
            <View style={[
              styles.stepLine,
              activeStep > (index + 1) && styles.stepLineActive
            ]} />
          )}
        </TouchableOpacity>
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
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe your event"
          placeholderTextColor="#a3a3a3"
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Category Selection */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                formData.category === category && styles.categoryButtonActive
              ]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                formData.category === category && styles.categoryButtonTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderLocation = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Location & Venue</Text>
      
      {/* Venue */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Venue Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter venue name"
          placeholderTextColor="#a3a3a3"
          value={formData.venue}
          onChangeText={(value) => handleInputChange('venue', value)}
        />
      </View>

      {/* City */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>City *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter city"
          placeholderTextColor="#a3a3a3"
          value={formData.city}
          onChangeText={(value) => handleInputChange('city', value)}
        />
      </View>

      {/* Address */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Address</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter full address"
          placeholderTextColor="#a3a3a3"
          value={formData.location}
          onChangeText={(value) => handleInputChange('location', value)}
        />
      </View>
    </View>
  );

  const renderDateTime = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Date & Time</Text>
      
      {/* Date */}
      <TouchableOpacity style={styles.inputContainer} onPress={handleDateSelect}>
        <Text style={styles.inputLabel}>Date *</Text>
        <View style={styles.dateTimeInput}>
          <Text style={styles.dateTimeText}>
            {formData.date || 'Select date'}
          </Text>
          <Ionicons name="calendar" size={20} color="#a3a3a3" />
        </View>
      </TouchableOpacity>

      {/* Time */}
      <TouchableOpacity style={styles.inputContainer} onPress={handleTimeSelect}>
        <Text style={styles.inputLabel}>Time *</Text>
        <View style={styles.dateTimeInput}>
          <Text style={styles.dateTimeText}>
            {formData.time || 'Select time'}
          </Text>
          <Ionicons name="time" size={20} color="#a3a3a3" />
        </View>
      </TouchableOpacity>

      {/* Recurring Event Toggle */}
      <View style={styles.recurringContainer}>
        <Text style={styles.inputLabel}>Recurring Event</Text>
        <Switch
          value={formData.isRecurring}
          onValueChange={handleRecurringToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={formData.isRecurring ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>

      {/* Recurring Configuration */}
      {formData.isRecurring && (
        <View style={styles.recurringConfig}>
          {/* Recurrence Type */}
          <Text style={styles.inputLabel}>Repeat</Text>
          <View style={styles.recurrenceTypeContainer}>
            {recurrenceOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.recurrenceTypeButton,
                  formData.recurrenceType === option.value && styles.selectedButton
                ]}
                onPress={() => handleRecurrenceTypeChange(option.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
              >
                <Text style={styles.recurrenceIcon}>{option.icon}</Text>
                <Text style={styles.recurrenceLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Interval */}
          <Text style={styles.inputLabel}>Every</Text>
          <View style={styles.intervalContainer}>
            <TextInput
              style={styles.intervalInput}
              value={formData.recurrenceInterval.toString()}
              onChangeText={(text) => handleInputChange('recurrenceInterval', parseInt(text) || 1)}
              keyboardType="numeric"
            />
            <Text style={styles.intervalLabel}>
              {formData.recurrenceType === 'daily' && 'days'}
              {formData.recurrenceType === 'weekly' && 'weeks'}
              {formData.recurrenceType === 'monthly' && 'months'}
              {formData.recurrenceType === 'yearly' && 'years'}
            </Text>
          </View>

          {/* Days of Week (for weekly) */}
          {formData.recurrenceType === 'weekly' && (
            <>
              <Text style={styles.inputLabel}>On Days</Text>
              <View style={styles.daysContainer}>
                {dayOptions.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayButton,
                      formData.recurrenceDays.includes(day.value) && styles.selectedDay
                    ]}
                    onPress={() => handleDayToggle(day.value)}
                  >
                    <Text style={styles.dayLabel}>{day.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderSummary = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Event Summary</Text>
      
      {/* Section Cards - Clickable for Editing */}
      {[
        {
          id: 'basic-info',
          title: 'Basic Information',
          icon: '📝',
          fields: [
            { label: 'Title', value: formData.title },
            { label: 'Description', value: formData.description },
            { label: 'Category', value: formData.category }
          ]
        },
        {
          id: 'location',
          title: 'Location & Venue',
          icon: '📍',
          fields: [
            { label: 'Venue', value: formData.venue },
            { label: 'City', value: formData.city },
            { label: 'Address', value: formData.location }
          ]
        },
        {
          id: 'date-time',
          title: 'Date & Time',
          icon: '📅',
          fields: [
            { label: 'Date', value: formData.date },
            { label: 'Time', value: formData.time },
            { label: 'Recurring', value: formData.isRecurring ? 'Yes' : 'No' }
          ]
        }
      ].map((section) => (
        <TouchableOpacity
          key={section.id}
          style={styles.sectionCard}
          onPress={() => {
            const stepIndex = steps.findIndex(s => s.id === section.id);
            if (stepIndex !== -1) {
              navigateToStep(stepIndex + 1);
            }
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>{section.icon}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
          
          <View style={styles.sectionPreview}>
            {section.fields.map((field, index) => (
              <Text key={index} style={styles.fieldPreview}>
                {field.label}: {field.value || 'Not set'}
              </Text>
            ))}
          </View>
        </TouchableOpacity>
      ))}
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.saveTemplateButton} onPress={() => setShowSaveTemplateModal(true)}>
          <Text style={styles.buttonText}>💾 Save as Template</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.publishButton, isLoading && styles.publishButtonDisabled]} 
          onPress={handlePublish}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Publishing...' : '🚀 Publish Event'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Last Saved Indicator */}
      {lastSaved && (
        <Text style={styles.lastSavedText}>
          Last saved: {lastSaved.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity style={styles.templateButton} onPress={() => setShowTemplateModal(true)}>
          <Ionicons name="bookmark" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeStep === 1 && renderBasicInfo()}
        {activeStep === 2 && renderLocation()}
        {activeStep === 3 && renderDateTime()}
        {activeStep === 4 && renderBasicInfo()} {/* Media step - reuse basic info for now */}
        {activeStep === 5 && renderBasicInfo()} {/* Tickets step - reuse basic info for now */}
        {activeStep === 6 && renderBasicInfo()} {/* Settings step - reuse basic info for now */}
        {activeStep === 7 && renderSummary()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {activeStep > 1 && (
          <TouchableOpacity style={styles.navButton} onPress={() => navigateToStep(activeStep - 1)}>
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        {activeStep < steps.length && (
          <TouchableOpacity 
            style={[styles.navButton, styles.nextButton]} 
            onPress={() => navigateToStep(activeStep + 1)}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Template Modal */}
      <Modal visible={showTemplateModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Event Templates</Text>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.templateList}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => useTemplate(template.id)}
              >
                <View style={styles.templateHeader}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateUsage}>Used {template.usage_count} times</Text>
                </View>
                <Text style={styles.templateDescription}>{template.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Save Template Modal */}
      <Modal visible={showSaveTemplateModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Save as Template</Text>
            <TouchableOpacity onPress={() => setShowSaveTemplateModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={styles.templateNameInput}
              placeholder="Template Name"
              value={templateName}
              onChangeText={setTemplateName}
            />
            
            <TextInput
              style={styles.templateDescriptionInput}
              placeholder="Description (optional)"
              value={templateDescription}
              onChangeText={setTemplateDescription}
              multiline
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowSaveTemplateModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={saveAsTemplate}>
                <Text>Save Template</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#007AFF',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  templateButton: {
    padding: 5,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepIcon: {
    fontSize: 16,
  },
  stepTitleSmall: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  stepTitleActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 20,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#e0e0e0',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 200,
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: '#a3a3a3',
    marginTop: 10,
  },
  eventImage: {
    width: 200,
    height: 120,
    borderRadius: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  dateTimeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  recurringContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  recurringConfig: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  recurrenceTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  recurrenceTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedButton: {
    backgroundColor: '#007AFF',
  },
  recurrenceIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  recurrenceLabel: {
    color: '#666',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  intervalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 60,
    marginRight: 10,
    textAlign: 'center',
  },
  intervalLabel: {
    fontSize: 16,
    color: '#666',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedDay: {
    backgroundColor: '#007AFF',
  },
  dayLabel: {
    color: '#666',
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sectionPreview: {
    marginLeft: 30,
  },
  fieldPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  actionButtons: {
    marginTop: 20,
  },
  saveTemplateButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  publishButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  lastSavedText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 10,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  navButtonText: {
    color: '#666',
    fontSize: 16,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  templateList: {
    flex: 1,
    padding: 20,
  },
  templateCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateUsage: {
    fontSize: 12,
    color: '#666',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalContent: {
    padding: 20,
  },
  templateNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  templateDescriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default EnhancedEventCreationScreen;

