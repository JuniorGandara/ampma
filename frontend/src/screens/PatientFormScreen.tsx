import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

interface PatientFormData {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  birthDate: Date;
  gender: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  address: string;
  city: string;
  province: string;
  country: string;
  bloodType: string;
  allergies: string;
  medications: string;
  medicalNotes: string;
  assignedToId: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function PatientFormScreen({ route, navigation }: any) {
  const { patientId, patient: existingPatient } = route.params || {};
  const isEditing = !!patientId;

  const [formData, setFormData] = useState<PatientFormData>({
	firstName: '',
	lastName: '',
	dni: '',
	phone: '',
	email: '',
	birthDate: new Date(),
	gender: 'FEMENINO',
	address: '',
	city: 'Córdoba',
	province: 'Córdoba',
	country: 'Argentina',
	bloodType: '',
	allergies: '',
	medications: '',
	medicalNotes: '',
	assignedToId: ''
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
	loadUsers();
	if (existingPatient) {
  	setFormData({
    	firstName: existingPatient.firstName || '',
    	lastName: existingPatient.lastName || '',
    	dni: existingPatient.dni || '',
    	phone: existingPatient.phone || '',
    	email: existingPatient.email || '',
    	birthDate: existingPatient.birthDate ? new Date(existingPatient.birthDate) : new Date(),
    	gender: existingPatient.gender || 'FEMENINO',
    	address: existingPatient.address || '',
    	city: existingPatient.city || 'Córdoba',
    	province: existingPatient.province || 'Córdoba',
    	country: existingPatient.country || 'Argentina',
    	bloodType: existingPatient.bloodType || '',
    	allergies: existingPatient.allergies || '',
    	medications: existingPatient.medications || '',
    	medicalNotes: existingPatient.medicalNotes || '',
    	assignedToId: existingPatient.assignedToId || ''
  	});
	}
  }, [existingPatient]);

  const loadUsers = async () => {
	try {
  	const response = await fetch(`${process.env.API_BASE_URL}/users`, {
    	headers: {
      	'Authorization': `Bearer ${global.authToken}`,
      	'Content-Type': 'application/json'
    	}
  	});

  	if (response.ok) {
    	const data = await response.json();
    	setUsers(data.users.filter((u: User) => u.role === 'MEDICO' || u.role === 'ADMIN'));
  	}
	} catch (error) {
  	console.error('Error cargando usuarios:', error);
	}
  };

  const validateForm = (): boolean => {
	const newErrors: { [key: string]: string } = {};

	// Validaciones requeridas
	if (!formData.firstName.trim()) {
  	newErrors.firstName = 'El nombre es obligatorio';
	}

	if (!formData.lastName.trim()) {
  	newErrors.lastName = 'El apellido es obligatorio';
	}

	if (!formData.dni.trim()) {
  	newErrors.dni = 'El DNI es obligatorio';
	} else if (!/^\d{7,8}$/.test(formData.dni.trim())) {
  	newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
	}

	if (!formData.phone.trim()) {
  	newErrors.phone = 'El teléfono es obligatorio';
	}

	if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
  	newErrors.email = 'El email no es válido';
	}

	// Validar fecha de nacimiento
	const today = new Date();
	const birthDate = new Date(formData.birthDate);
	if (birthDate >= today) {
  	newErrors.birthDate = 'La fecha de nacimiento debe ser anterior a hoy';
	}

	const age = today.getFullYear() - birthDate.getFullYear();
	if (age < 18) {
  	newErrors.birthDate = 'El paciente debe ser mayor de 18 años';
	}

	setErrors(newErrors);
	return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
	if (!validateForm()) {
  	Alert.alert('Errores en el formulario', 'Por favor corrige los errores marcados');
  	return;
	}

	setLoading(true);

	try {
  	const url = isEditing
    	? `${process.env.API_BASE_URL}/patients/${patientId}`
    	: `${process.env.API_BASE_URL}/patients`;

  	const method = isEditing ? 'PUT' : 'POST';

  	const response = await fetch(url, {
    	method,
    	headers: {
      	'Authorization': `Bearer ${global.authToken}`,
      	'Content-Type': 'application/json'
    	},
    	body: JSON.stringify({
      	...formData,
      	email: formData.email.trim() || undefined,
      	assignedToId: formData.assignedToId || undefined
    	})
  	});

  	const data = await response.json();

  	if (!response.ok) {
    	if (response.status === 409) {
      	Alert.alert('Error', data.error || 'Ya existe un paciente con esos datos');
    	} else {
      	throw new Error(data.error || 'Error al guardar el paciente');
    	}
    	return;
  	}

  	Alert.alert(
    	'Éxito',
    	isEditing ? 'Paciente actualizado correctamente' : 'Paciente creado correctamente',
    	[
      	{
        	text: 'OK',
        	onPress: () => {
          	if (isEditing) {
            	navigation.goBack();
          	} else {
            	navigation.replace('PatientDetails', { patientId: data.patient.id });
          	}
        	}
      	}
    	]
  	);

	} catch (error) {
  	console.error('Error guardando paciente:', error);
  	Alert.alert('Error', 'No se pudo guardar el paciente');
	} finally {
  	setLoading(false);
	}
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
	setShowDatePicker(false);
	if (selectedDate) {
  	setFormData(prev => ({ ...prev, birthDate: selectedDate }));
	}
  };

  const updateField = (field: keyof PatientFormData, value: any) => {
	setFormData(prev => ({ ...prev, [field]: value }));
	if (errors[field]) {
  	setErrors(prev => ({ ...prev, [field]: '' }));
	}
  };

  const renderInput = (
	label: string,
	field: keyof PatientFormData,
	placeholder: string,
	options?: {
  	multiline?: boolean;
  	keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  	required?: boolean;
	}
  ) => (
	<View style={styles.inputGroup}>
  	<Text style={styles.inputLabel}>
    	{label}
    	{options?.required && <Text style={styles.required}> *</Text>}
  	</Text>
  	<TextInput
    	style={[
      	styles.textInput,
      	options?.multiline && styles.textArea,
      	errors[field] && styles.inputError
    	]}
    	value={String(formData[field])}
    	onChangeText={(text) => updateField(field, text)}
    	placeholder={placeholder}
    	keyboardType={options?.keyboardType || 'default'}
    	multiline={options?.multiline}
    	numberOfLines={options?.multiline ? 4 : 1}
    	textAlignVertical={options?.multiline ? 'top' : 'center'}
  	/>
  	{errors[field] && (
    	<Text style={styles.errorText}>{errors[field]}</Text>
  	)}
	</View>
  );

  return (
	<KeyboardAvoidingView
  	style={styles.container}
  	behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
	>
  	{/* Header */}
  	<View style={styles.header}>
    	<TouchableOpacity onPress={() => navigation.goBack()}>
      	<Ionicons name="close" size={24} color="#333" />
    	</TouchableOpacity>
    	<Text style={styles.headerTitle}>
      	{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
    	</Text>
    	<TouchableOpacity onPress={handleSave} disabled={loading}>
      	{loading ? (
        	<ActivityIndicator size="small" color="#2c5aa0" />
      	) : (
        	<Text style={styles.saveButton}>Guardar</Text>
      	)}
    	</TouchableOpacity>
  	</View>

  	<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
    	{/* Información Personal */}
    	<View style={styles.section}>
      	<Text style={styles.sectionTitle}>Información Personal</Text>
     	 
      	{renderInput('Nombre', 'firstName', 'Ingresa el nombre', { required: true })}
      	{renderInput('Apellido', 'lastName', 'Ingresa el apellido', { required: true })}
      	{renderInput('DNI', 'dni', 'Ej: 12345678', { keyboardType: 'numeric', required: true })}

      	{/* Fecha de Nacimiento */}
      	<View style={styles.inputGroup}>
        	<Text style={styles.inputLabel}>
          	Fecha de Nacimiento <Text style={styles.required}>*</Text>
        	</Text>
        	<TouchableOpacity
          	style={[styles.dateButton, errors.birthDate && styles.inputError]}
          	onPress={() => setShowDatePicker(true)}
        	>
          	<Text style={styles.dateButtonText}>
            	{formData.birthDate.toLocaleDateString('es-AR')}
          	</Text>
          	<Ionicons name="calendar-outline" size={20} color="#666" />
        	</TouchableOpacity>
        	{errors.birthDate && (
          	<Text style={styles.errorText}>{errors.birthDate}</Text>
        	)}
      	</View>

      	{/* Género */}
      	<View style={styles.inputGroup}>
        	<Text style={styles.inputLabel}>
          	Género <Text style={styles.required}>*</Text>
        	</Text>
        	<View style={styles.pickerContainer}>
          	<Picker
            	selectedValue={formData.gender}
            	onValueChange={(value) => updateField('gender', value)}
          	>
            	<Picker.Item label="Femenino" value="FEMENINO" />
            	<Picker.Item label="Masculino" value="MASCULINO" />
            	<Picker.Item label="Otro" value="OTRO" />
          	</Picker>
        	</View>
      	</View>
    	</View>

    	{/* Contacto */}
    	<View style={styles.section}>
      	<Text style={styles.sectionTitle}>Contacto</Text>
     	 
      	{renderInput('Teléfono', 'phone', 'Ej: 351 123 4567', {
        	keyboardType: 'phone-pad',
        	required: true
      	})}
      	{renderInput('Email', 'email', 'ejemplo@correo.com', {
        	keyboardType: 'email-address'
      	})}
      	{renderInput('Dirección', 'address', 'Calle y número')}
      	{renderInput('Ciudad', 'city', 'Ciudad')}
      	{renderInput('Provincia', 'province', 'Provincia')}
    	</View>

    	{/* Información Médica */}
    	<View style={styles.section}>
      	<Text style={styles.sectionTitle}>Información Médica</Text>
     	 
      	{/* Tipo de Sangre */}
      	<View style={styles.inputGroup}>
        	<Text style={styles.inputLabel}>Tipo de Sangre</Text>
        	<View style={styles.pickerContainer}>
          	<Picker
            	selectedValue={formData.bloodType}
            	onValueChange={(value) => updateField('bloodType', value)}
          	>
            	<Picker.Item label="No especificado" value="" />
            	<Picker.Item label="A+" value="A+" />
            	<Picker.Item label="A-" value="A-" />
            	<Picker.Item label="B+" value="B+" />
            	<Picker.Item label="B-" value="B-" />
            	<Picker.Item label="AB+" value="AB+" />
            	<Picker.Item label="AB-" value="AB-" />
            	<Picker.Item label="O+" value="O+" />
            	<Picker.Item label="O-" value="O-" />
          	</Picker>
        	</View>
      	</View>

      	{renderInput('Alergias Conocidas', 'allergies',
        	'Describe cualquier alergia conocida...', { multiline: true })}
      	{renderInput('Medicamentos Actuales', 'medications',
        	'Lista los medicamentos que toma actualmente...', { multiline: true })}
      	{renderInput('Notas Médicas', 'medicalNotes',
        	'Observaciones médicas adicionales...', { multiline: true })}
    	</View>

    	{/* Asignación */}
    	<View style={styles.section}>
      	<Text style={styles.sectionTitle}>Asignación</Text>
     	 
      	<View style={styles.inputGroup}>
        	<Text style={styles.inputLabel}>Médico Asignado</Text>
        	<View style={styles.pickerContainer}>
          	<Picker
            	selectedValue={formData.assignedToId}
            	onValueChange={(value) => updateField('assignedToId', value)}
          	>
            	<Picker.Item label="Sin asignar" value="" />
            	{users.map((user) => (
              	<Picker.Item
                	key={user.id}
                	label={`Dr/a. ${user.firstName} ${user.lastName}`}
                	value={user.id}
              	/>
            	))}
          	</Picker>
        	</View>
      	</View>
    	</View>

    	<View style={styles.bottomSpacing} />
  	</ScrollView>

  	{/* Date Picker Modal */}
  	{showDatePicker && (
    	<DateTimePicker
      	value={formData.birthDate}
      	mode="date"
      	display="default"
      	onChange={handleDateChange}
      	maximumDate={new Date()}
      	minimumDate={new Date(1920, 0, 1)}
    	/>
  	)}
	</KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
	flex: 1,
	backgroundColor: '#f5f5f5'
  },
  header: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	paddingHorizontal: 20,
	paddingVertical: 15,
	backgroundColor: 'white',
	borderBottomWidth: 1,
	borderBottomColor: '#e0e0e0'
  },
  headerTitle: {
	fontSize: 18,
	fontWeight: 'bold',
	color: '#333'
  },
  saveButton: {
	fontSize: 16,
	color: '#2c5aa0',
	fontWeight: '500'
  },
  content: {
	flex: 1,
	padding: 20
  },
  section: {
	backgroundColor: 'white',
	borderRadius: 12,
	padding: 16,
	marginBottom: 16
  },
  sectionTitle: {
	fontSize: 18,
	fontWeight: 'bold',
	color: '#333',
	marginBottom: 16
  },
  inputGroup: {
	marginBottom: 16
  },
  inputLabel: {
	fontSize: 16,
	fontWeight: '500',
	color: '#333',
	marginBottom: 8
  },
  required: {
	color: '#f44336'
  },
  textInput: {
	borderWidth: 1,
	borderColor: '#ddd',
	borderRadius: 8,
	paddingHorizontal: 12,
	paddingVertical: 12,
	fontSize: 16,
	backgroundColor: '#fafafa'
  },
  textArea: {
	height: 100,
	textAlignVertical: 'top'
  },
  inputError: {
	borderColor: '#f44336'
  },
  errorText: {
	color: '#f44336',
	fontSize: 14,
	marginTop: 4
  },
  dateButton: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	borderWidth: 1,
	borderColor: '#ddd',
	borderRadius: 8,
	paddingHorizontal: 12,
	paddingVertical: 12,
	backgroundColor: '#fafafa'
  },
  dateButtonText: {
	fontSize: 16,
	color: '#333'
  },
  pickerContainer: {
	borderWidth: 1,
	borderColor: '#ddd',
	borderRadius: 8,
	backgroundColor: '#fafafa',
	overflow: 'hidden'
  },
  bottomSpacing: {
	height: 40
  }
});
