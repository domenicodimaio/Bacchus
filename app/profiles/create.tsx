import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

export default function CreateProfileScreen() {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [drinkingFrequency, setDrinkingFrequency] = useState('Occasionally');
  const [isDefault, setIsDefault] = useState(false);

  const handleCreateProfile = () => {
    // Validate inputs
    if (!name || !weight || !age) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isNaN(Number(weight)) || isNaN(Number(age))) {
      Alert.alert('Error', 'Weight and age must be numbers');
      return;
    }

    // In a real app, we would save this profile to a database
    Alert.alert(
      'Profile Created',
      `Profile "${name}" has been created successfully`,
      [
        {
          text: 'OK',
          onPress: () => router.push('/profiles')
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a New Profile</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter profile name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />
        
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter weight in kg"
          placeholderTextColor="#888"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />
        
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter age"
          placeholderTextColor="#888"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
        
        <Text style={styles.label}>Gender</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={gender}
            onValueChange={(itemValue) => setGender(itemValue)}
            style={styles.picker}
            dropdownIconColor="#ffffff"
          >
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>
        
        <Text style={styles.label}>Drinking Frequency</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={drinkingFrequency}
            onValueChange={(itemValue) => setDrinkingFrequency(itemValue)}
            style={styles.picker}
            dropdownIconColor="#ffffff"
          >
            <Picker.Item label="Rarely" value="Rarely" />
            <Picker.Item label="Occasionally" value="Occasionally" />
            <Picker.Item label="Frequently" value="Frequently" />
          </Picker>
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Set as Default Profile</Text>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: '#3e3e3e', true: '#2196F3' }}
            thumbColor={isDefault ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        
        <TouchableOpacity style={styles.button} onPress={handleCreateProfile}>
          <Text style={styles.buttonText}>Create Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 25,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    color: '#ffffff',
  },
  pickerContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 20,
  },
  picker: {
    color: '#ffffff',
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 