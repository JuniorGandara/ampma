import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as DocumentPicker from 'expo-document-picker';

interface PatientDetails {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email?: string;
  birthDate: string;
  age: number;
  gender: string;
  address?: string;
  city?: string;
  bloodType?: string;
  allergies?: string;
  medications?: string;
  medicalNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
	firstName: string;
	lastName: string;
  };
  medicalRecords: MedicalRecord[];
  appointments: Appointment[];
  treatments: Treatment[];
  invoices: Invoice[];
  stats: {
	totalAppointments: number;
	activeTreatments: number;
	totalInvoiced: number;
	lastVisit?: string;
  };
}

interface MedicalRecord {
  id: string;
  title: string;
  description: string;
  recordDate: string;
  attachments: string[];
}

interface Appointment {
  id: string;
  startTime: string;
  status: string;
  treatment: {
	name: string;
	category: string;
  };
  user: {
	firstName: string;
	lastName: string;
  };
}

interface Treatment {
  id: string;
  startDate: string;
  endDate?: string;
  status: string;
  sessions: number;
  completedSessions: number;
  notes?: string;
  treatment: {
	name: string;
	category: string;
	price: number;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  invoiceDate: string;
}

export default function PatientDetailsScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showMedicalRecordModal, setShowMedicalRecordModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
	title: '',
	description: '',
	attachments: [] as any[]
  });

  useEffect(() => {
	loadPatientDetails();
  }, [patientId]);

  const loadPatientDetails = async () => {
	try {
  	const response = await fetch(`${process.env.API_BASE_URL}/patients/${patientId}`, {
    	headers: {
      	'Authorization': `Bearer ${global.authToken}`,
      	'Content-Type': 'application/json'
    	}
  	});

  	if (!response.ok) {
    	throw new Error(`Error: ${response.status}`);
  	}

  	const data = await response.json();
  	setPatient(data);
	} catch (error) {
  	console.error('Error cargando detalles del paciente:', error);
  	Alert.alert('Error', 'No se pudieron cargar los detalles del paciente');
  	navigation.goBack();
	} finally {
  	setLoading(false);
	}
  };

  const makePhoneCall = (phoneNumber: string) => {
	Linking.openURL(`tel:${phoneNumber}`);
  };

  const sendEmail = (email: string) => {
	Linking.openURL(`mailto:${email}`);
  };

  const editPatient = () => {
	navigation.navigate('EditPatient', { patientId, patient });
  };

  const createAppointment = () => {
	navigation.navigate('CreateAppointment', { patientId });
  };

  const pickDocuments = async () => {
	try {
  	const result = await DocumentPicker.getDocumentAsync({
    	multiple: true,
    	type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  	});

  	if (!result.canceled) {
    	setNewRecord(prev => ({
      	...prev,
      	attachments: [...prev.attachments, ...result.assets]
    	}));
  	}
	} catch (error) {
  	Alert.alert('Error', 'No se pudieron seleccionar los archivos');
	}
  };

  const createMedicalRecord = async () => {
	if (!newRecord.title.trim() || !newRecord.description.trim()) {
  	Alert.alert('Error', 'El título y la descripción son obligatorios');
  	return;
	}

	try {
  	const formData = new FormData();
  	formData.append('title', newRecord.title);
  	formData.append('description', newRecord.description);

  	newRecord.attachments.forEach((file, index) => {
    	formData.append('attachments', {
      	uri: file.uri,
      	type: file.mimeType,
      	name: file.name
    	} as any);
  	});

  	const response = await fetch(`${process.env.API_BASE_URL}/patients/${patientId}/medical-records`, {
    	method: 'POST',
    	headers: {
      	'Authorization': `Bearer ${global.authToken}`,
      	'Content-Type': 'multipart/form-data'
    	},
    	body: formData
  	});

  	if (!response.ok) {
    	throw new Error(`Error: ${response.status}`);
  	}

  	Alert.alert('Éxito', 'Historial médico creado correctamente');
  	setShowMedicalRecordModal(false);
  	setNewRecord({ title: '', description: '', attachments: [] });
  	loadPatientDetails();
	} catch (error) {
  	console.error('Error creando historial médico:', error);
  	Alert.alert('Error', 'No se pudo crear el historial médico');
	}
  };

  const getStatusColor = (status: string) => {
	const colors: { [key: string]: string } = {
  	'ACTIVO': '#4caf50',
  	'COMPLETADO': '#2196f3',
  	'SUSPENDIDO': '#ff9800',
  	'CANCELADO': '#f44336',
  	'PROGRAMADA': '#2196f3',
  	'CONFIRMADA': '#4caf50',
  	'COMPLETADA': '#4caf50',
  	'CANCELADA': '#f44336',
  	'NO_ASISTIO': '#ff9800',
  	'PENDIENTE': '#ff9800',
  	'PAGADA': '#4caf50'
	};
	return colors[status] || '#666';
  };

  const renderInfoTab = () => (
	<View style={styles.tabContent}>
  	{/* Información Personal */}
  	<View style={styles.section}>
    	<Text style={styles.sectionTitle}>Información Personal</Text>
    	<View style={styles.infoGrid}>
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Nombre Completo</Text>
        	<Text style={styles.infoValue}>{patient?.firstName} {patient?.lastName}</Text>
      	</View>
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>DNI</Text>
        	<Text style={styles.infoValue}>{patient?.dni}</Text>
      	</View>
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Edad</Text>
        	<Text style={styles.infoValue}>{patient?.age} años</Text>
      	</View>
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Género</Text>
        	<Text style={styles.infoValue}>{patient?.gender}</Text>
      	</View>
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
        	<Text style={styles.infoValue}>
          	{patient?.birthDate && format(new Date(patient.birthDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
        	</Text>
      	</View>
    	</View>
  	</View>

  	{/* Contacto */}
  	<View style={styles.section}>
    	<Text style={styles.sectionTitle}>Contacto</Text>
    	<TouchableOpacity
      	style={styles.contactItem}
      	onPress={() => makePhoneCall(patient?.phone || '')}
    	>
      	<Ionicons name="call" size={20} color="#2c5aa0" />
      	<Text style={styles.contactText}>{patient?.phone}</Text>
    	</TouchableOpacity>
    	{patient?.email && (
      	<TouchableOpacity
        	style={styles.contactItem}
        	onPress={() => sendEmail(patient.email!)}
      	>
        	<Ionicons name="mail" size={20} color="#2c5aa0" />
        	<Text style={styles.contactText}>{patient.email}</Text>
      	</TouchableOpacity>
    	)}
    	{patient?.address && (
      	<View style={styles.contactItem}>
        	<Ionicons name="location" size={20} color="#666" />
        	<Text style={styles.contactText}>
          	{patient.address}
          	{patient.city && `, ${patient.city}`}
        	</Text>
      	</View>
    	)}
  	</View>

  	{/* Información Médica */}
  	<View style={styles.section}>
    	<Text style={styles.sectionTitle}>Información Médica</Text>
    	{patient?.bloodType && (
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Tipo de Sangre</Text>
        	<Text style={styles.infoValue}>{patient.bloodType}</Text>
      	</View>
    	)}
    	{patient?.allergies && (
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Alergias</Text>
        	<Text style={styles.infoValue}>{patient.allergies}</Text>
      	</View>
    	)}
    	{patient?.medications && (
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Medicamentos</Text>
        	<Text style={styles.infoValue}>{patient.medications}</Text>
      	</View>
    	)}
    	{patient?.medicalNotes && (
      	<View style={styles.infoItem}>
        	<Text style={styles.infoLabel}>Notas Médicas</Text>
        	<Text style={styles.infoValue}>{patient.medicalNotes}</Text>
      	</View>
    	)}
  	</View>

  	{/* Estadísticas */}
  	<View style={styles.section}>
    	<Text style={styles.sectionTitle}>Estadísticas</Text>
    	<View style={styles.statsGrid}>
      	<View style={styles.statItem}>
        	<Text style={styles.statNumber}>{patient?.stats.totalAppointments}</Text>
        	<Text style={styles.statLabel}>Citas Totales</Text>
      	</View>
      	<View style={styles.statItem}>
        	<Text style={styles.statNumber}>{patient?.stats.activeTreatments}</Text>
        	<Text style={styles.statLabel}>Tratamientos Activos</Text>
      	</View>
      	<View style={styles.statItem}>
        	<Text style={styles.statNumber}>${patient?.stats.totalInvoiced.toFixed(2)}</Text>
        	<Text style={styles.statLabel}>Total Facturado</Text>
      	</View>
    	</View>
    	{patient?.stats.lastVisit && (
      	<Text style={styles.lastVisit}>
        	Última visita: {format(new Date(patient.stats.lastVisit), "dd 'de' MMM, yyyy", { locale: es })}
      	</Text>
    	)}
  	</View>
	</View>
  );

  const renderMedicalRecordsTab = () => (
	<View style={styles.tabContent}>
  	<View style={styles.sectionHeader}>
    	<Text style={styles.sectionTitle}>Historiales Médicos</Text>
    	<TouchableOpacity
      	style={styles.addButton}
      	onPress={() => setShowMedicalRecordModal(true)}
    	>
      	<Ionicons name="add" size={20} color="white" />
    	</TouchableOpacity>
  	</View>

  	{patient?.medicalRecords.map((record) => (
    	<View key={record.id} style={styles.recordCard}>
      	<View style={styles.recordHeader}>
        	<Text style={styles.recordTitle}>{record.title}</Text>
        	<Text style={styles.recordDate}>
          	{format(new Date(record.recordDate), "dd/MM/yyyy", { locale: es })}
        	</Text>
      	</View>
      	<Text style={styles.recordDescription}>{record.description}</Text>
      	{record.attachments.length > 0 && (
        	<View style={styles.attachments}>
          	<Text style={styles.attachmentsLabel}>Archivos adjuntos:</Text>
          	{record.attachments.map((attachment, index) => (
            	<TouchableOpacity key={index} style={styles.attachmentItem}>
              	<Ionicons name="document" size={16} color="#2c5aa0" />
              	<Text style={styles.attachmentName}>
                	Archivo {index + 1}
              	</Text>
            	</TouchableOpacity>
          	))}
        	</View>
      	)}
    	</View>
  	))}

  	{(!patient?.medicalRecords || patient.medicalRecords.length === 0) && (
    	<View style={styles.emptyState}>
      	<Ionicons name="folder-outline" size={48} color="#ccc" />
      	<Text style={styles.emptyText}>No hay historiales médicos</Text>
    	</View>
  	)}
	</View>
  );

  const renderAppointmentsTab = () => (
	<View style={styles.tabContent}>
  	<View style={styles.sectionHeader}>
    	<Text style={styles.sectionTitle}>Citas</Text>
    	<TouchableOpacity
      	style={styles.addButton}
      	onPress={createAppointment}
    	>
      	<Ionicons name="add" size={20} color="white" />
    	</TouchableOpacity>
  	</View>

  	{patient?.appointments.map((appointment) => (
    	<View key={appointment.id} style={styles.appointmentCard}>
      	<View style={styles.appointmentHeader}>
        	<Text style={styles.appointmentTitle}>{appointment.treatment.name}</Text>
        	<View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          	<Text style={styles.statusText}>{appointment.status}</Text>
        	</View>
      	</View>
      	<Text style={styles.appointmentDate}>
        	{format(new Date(appointment.startTime), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
      	</Text>
      	<Text style={styles.appointmentDoctor}>
        	Dr/a. {appointment.user.firstName} {appointment.user.lastName}
      	</Text>
      	<Text style={styles.appointmentCategory}>{appointment.treatment.category}</Text>
    	</View>
  	))}

  	{(!patient?.appointments || patient.appointments.length === 0) && (
    	<View style={styles.emptyState}>
      	<Ionicons name="calendar-outline" size={48} color="#ccc" />
      	<Text style={styles.emptyText}>No hay citas registradas</Text>
    	</View>
  	)}
	</View>
  );

  const renderTreatmentsTab = () => (
	<View style={styles.tabContent}>
  	<Text style={styles.sectionTitle}>Tratamientos</Text>

  	{patient?.treatments.map((treatment) => (
    	<View key={treatment.id} style={styles.treatmentCard}>
      	<View style={styles.treatmentHeader}>
        	<Text style={styles.treatmentName}>{treatment.treatment.name}</Text>
        	<View style={[styles.statusBadge, { backgroundColor: getStatusColor(treatment.status) }]}>
          	<Text style={styles.statusText}>{treatment.status}</Text>
        	</View>
      	</View>
      	<Text style={styles.treatmentCategory}>{treatment.treatment.category}</Text>
      	<Text style={styles.treatmentPrice}>${treatment.treatment.price}</Text>
      	<View style={styles.treatmentProgress}>
        	<Text style={styles.progressText}>
          	Progreso: {treatment.completedSessions}/{treatment.sessions} sesiones
        	</Text>
        	<View style={styles.progressBar}>
          	<View
            	style={[
              	styles.progressFill,
              	{ width: `${(treatment.completedSessions / treatment.sessions) * 100}%` }
            	]}
          	/>
        	</View>
      	</View>
      	<Text style={styles.treatmentDates}>
        	Inicio: {format(new Date(treatment.startDate), "dd/MM/yyyy", { locale: es })}
        	{treatment.endDate && (
          	<Text> • Fin: {format(new Date(treatment.endDate), "dd/MM/yyyy", { locale: es })}</Text>
        	)}
      	</Text>
      	{treatment.notes && (
        	<Text style={styles.treatmentNotes}>Notas: {treatment.notes}</Text>
      	)}
    	</View>
  	))}

  	{(!patient?.treatments || patient.treatments.length === 0) && (
    	<View style={styles.emptyState}>
      	<Ionicons name="medical-outline" size={48} color="#ccc" />
      	<Text style={styles.emptyText}>No hay tratamientos activos</Text>
    	</View>
  	)}
	</View>
  );

  const renderMedicalRecordModal = () => (
	<Modal
  	visible={showMedicalRecordModal}
  	animationType="slide"
  	presentationStyle="pageSheet"
  	onRequestClose={() => setShowMedicalRecordModal(false)}
	>
  	<View style={styles.modalContainer}>
    	<View style={styles.modalHeader}>
      	<TouchableOpacity onPress={() => setShowMedicalRecordModal(false)}>
        	<Text style={styles.cancelButton}>Cancelar</Text>
      	</TouchableOpacity>
      	<Text style={styles.modalTitle}>Nuevo Historial</Text>
      	<TouchableOpacity onPress={createMedicalRecord}>
        	<Text style={styles.saveButton}>Guardar</Text>
      	</TouchableOpacity>
    	</View>

    	<ScrollView style={styles.modalContent}>
      	<View style={styles.inputGroup}>
        	<Text style={styles.inputLabel}>Título *</Text>
        	<TextInput
          	style={styles.textInput}
          	value={newRecord.title}
          	onChangeText={(text) => setNewRecord(prev => ({ ...prev, title: text }))}
          	placeholder="Ej: Consulta inicial, Control post-tratamiento..."
        	/>
      	</View>

      	<View style={styles.inputGroup}>
        	<Text style={styles.inputLabel}>Descripción *</Text>
        	<TextInput
          	style={[styles.textInput, styles.textArea]}
          	value={newRecord.description}
          	onChangeText={(text) => setNewRecord(prev => ({ ...prev, description: text }))}
          	placeholder="Describe los hallazgos, observaciones, recomendaciones..."
          	multiline
          	numberOfLines={6}
        	/>
      	</View>

      	<View style={styles.inputGroup}>
        	<Text style={styles.inputLabel}>Archivos Adjuntos</Text>
        	<TouchableOpacity style={styles.uploadButton} onPress={pickDocuments}>
          	<Ionicons name="attach" size={20} color="#2c5aa0" />
          	<Text style={styles.uploadButtonText}>Adjuntar archivos</Text>
        	</TouchableOpacity>
       	 
        	{newRecord.attachments.map((file, index) => (
          	<View key={index} style={styles.attachedFile}>
            	<Ionicons name="document" size={16} color="#666" />
            	<Text style={styles.fileName}>{file.name}</Text>
            	<TouchableOpacity
              	onPress={() => setNewRecord(prev => ({
                	...prev,
                	attachments: prev.attachments.filter((_, i) => i !== index)
              	}))}
            	>
              	<Ionicons name="close-circle" size={20} color="#f44336" />
            	</TouchableOpacity>
          	</View>
        	))}
      	</View>
    	</ScrollView>
  	</View>
	</Modal>
  );

  if (loading) {
	return (
  	<View style={styles.loadingContainer}>
    	<ActivityIndicator size="large" color="#2c5aa0" />
    	<Text style={styles.loadingText}>Cargando detalles...</Text>
  	</View>
	);
  }

  if (!patient) {
	return (
  	<View style={styles.errorContainer}>
    	<Text style={styles.errorText}>No se encontró el paciente</Text>
  	</View>
	);
  }

  return (
	<View style={styles.container}>
  	{/* Header */}
  	<View style={styles.header}>
    	<TouchableOpacity onPress={() => navigation.goBack()}>
      	<Ionicons name="arrow-back" size={24} color="#333" />
    	</TouchableOpacity>
    	<Text style={styles.headerTitle}>
      	{patient.firstName} {patient.lastName}
    	</Text>
    	<TouchableOpacity onPress={editPatient}>
      	<Ionicons name="create-outline" size={24} color="#2c5aa0" />
    	</TouchableOpacity>
  	</View>

  	{/* Tabs */}
  	<View style={styles.tabsContainer}>
    	{[
      	{ key: 'info', label: 'Info', icon: 'person' },
      	{ key: 'medical', label: 'Historial', icon: 'folder' },
      	{ key: 'appointments', label: 'Citas', icon: 'calendar' },
      	{ key: 'treatments', label: 'Tratamientos', icon: 'medical' }
    	].map((tab) => (
      	<TouchableOpacity
        	key={tab.key}
        	style={[styles.tab, activeTab === tab.key && styles.activeTab]}
        	onPress={() => setActiveTab(tab.key)}
      	>
        	<Ionicons
          	name={tab.icon as any}
          	size={20}
          	color={activeTab === tab.key ? '#2c5aa0' : '#666'}
        	/>
        	<Text style={[
          	styles.tabLabel,
          	activeTab === tab.key && styles.activeTabLabel
        	]}>
          	{tab.label}
        	</Text>
      	</TouchableOpacity>
    	))}
  	</View>

  	{/* Content */}
  	<ScrollView style={styles.content}>
    	{activeTab === 'info' && renderInfoTab()}
    	{activeTab === 'medical' && renderMedicalRecordsTab()}
    	{activeTab === 'appointments' && renderAppointmentsTab()}
    	{activeTab === 'treatments' && renderTreatmentsTab()}
  	</ScrollView>

  	{/* Modal */}
  	{renderMedicalRecordModal()}
	</View>
  );
}

const styles = StyleSheet.create({
  container: {
	flex: 1,
	backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
	flex: 1,
	justifyContent: 'center',
	alignItems: 'center'
  },
  loadingText: {
	marginTop: 10,
	fontSize: 16,
	color: '#666'
  },
  errorContainer: {
	flex: 1,
	justifyContent: 'center',
	alignItems: 'center'
  },
  errorText: {
	fontSize: 18,
	color: '#f44336'
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
	fontSize: 20,
	fontWeight: 'bold',
	color: '#333'
  },
  tabsContainer: {
	flexDirection: 'row',
	backgroundColor: 'white',
	borderBottomWidth: 1,
	borderBottomColor: '#e0e0e0'
  },
  tab: {
	flex: 1,
	paddingVertical: 12,
	alignItems: 'center',
	borderBottomWidth: 2,
	borderBottomColor: 'transparent'
  },
  activeTab: {
	borderBottomColor: '#2c5aa0'
  },
  tabLabel: {
	fontSize: 12,
	color: '#666',
	marginTop: 4
  },
  activeTabLabel: {
	color: '#2c5aa0',
	fontWeight: '500'
  },
  content: {
	flex: 1
  },
  tabContent: {
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
  sectionHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	marginBottom: 16
  },
  addButton: {
	backgroundColor: '#2c5aa0',
	paddingHorizontal: 12,
	paddingVertical: 6,
	borderRadius: 6
  },
  infoGrid: {
	gap: 12
  },
  infoItem: {
	marginBottom: 12
  },
  infoLabel: {
	fontSize: 14,
	color: '#666',
	marginBottom: 4
  },
  infoValue: {
	fontSize: 16,
	color: '#333',
	fontWeight: '500'
  },
  contactItem: {
	flexDirection: 'row',
	alignItems: 'center',
	paddingVertical: 8,
	gap: 12
  },
  contactText: {
	fontSize: 16,
	color: '#2c5aa0'
  },
  statsGrid: {
	flexDirection: 'row',
	justifyContent: 'space-around',
	marginBottom: 16
  },
  statItem: {
	alignItems: 'center'
  },
  statNumber: {
	fontSize: 24,
	fontWeight: 'bold',
	color: '#2c5aa0'
  },
  statLabel: {
	fontSize: 12,
	color: '#666',
	textAlign: 'center'
  },
  lastVisit: {
	fontSize: 14,
	color: '#666',
	textAlign: 'center',
	fontStyle: 'italic'
  },
  recordCard: {
	backgroundColor: 'white',
	borderRadius: 8,
	padding: 16,
	marginBottom: 12,
	borderLeftWidth: 4,
	borderLeftColor: '#2c5aa0'
  },
  recordHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	marginBottom: 8
  },
  recordTitle: {
	fontSize: 16,
	fontWeight: 'bold',
	color: '#333',
	flex: 1
  },
  recordDate: {
	fontSize: 12,
	color: '#666'
  },
  recordDescription: {
	fontSize: 14,
	color: '#666',
	lineHeight: 20,
	marginBottom: 8
  },
  attachments: {
	borderTopWidth: 1,
	borderTopColor: '#f0f0f0',
	paddingTop: 8
  },
  attachmentsLabel: {
	fontSize: 12,
	color: '#666',
	marginBottom: 4
  },
  attachmentItem: {
	flexDirection: 'row',
	alignItems: 'center',
	gap: 8,
	paddingVertical: 4
  },
  attachmentName: {
	fontSize: 14,
	color: '#2c5aa0'
  },
  appointmentCard: {
	backgroundColor: 'white',
	borderRadius: 8,
	padding: 16,
	marginBottom: 12
  },
  appointmentHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	marginBottom: 8
  },
  appointmentTitle: {
	fontSize: 16,
	fontWeight: 'bold',
	color: '#333',
	flex: 1
  },
  statusBadge: {
	paddingHorizontal: 8,
	paddingVertical: 4,
	borderRadius: 12
  },
  statusText: {
	color: 'white',
	fontSize: 12,
	fontWeight: '500'
  },
  appointmentDate: {
	fontSize: 14,
	color: '#666',
	marginBottom: 4
  },
  appointmentDoctor: {
	fontSize: 14,
	color: '#2c5aa0',
	marginBottom: 4
  },
  appointmentCategory: {
	fontSize: 12,
	color: '#666'
  },
  treatmentCard: {
	backgroundColor: 'white',
	borderRadius: 8,
	padding: 16,
	marginBottom: 12
  },
  treatmentHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	marginBottom: 8
  },
  treatmentName: {
	fontSize: 16,
	fontWeight: 'bold',
	color: '#333',
	flex: 1
  },
  treatmentCategory: {
	fontSize: 14,
	color: '#666',
	marginBottom: 4
  },
  treatmentPrice: {
	fontSize: 16,
	fontWeight: 'bold',
	color: '#4caf50',
	marginBottom: 8
  },
  treatmentProgress: {
	marginBottom: 8
  },
  progressText: {
	fontSize: 14,
	color: '#666',
	marginBottom: 4
  },
  progressBar: {
	height: 6,
	backgroundColor: '#e0e0e0',
	borderRadius: 3
  },
  progressFill: {
	height: '100%',
	backgroundColor: '#4caf50',
	borderRadius: 3
  },
  treatmentDates: {
	fontSize: 12,
	color: '#666',
	marginBottom: 4
  },
  treatmentNotes: {
	fontSize: 14,
	color: '#666',
	fontStyle: 'italic'
  },
  emptyState: {
	alignItems: 'center',
	paddingVertical: 40
  },
  emptyText: {
	fontSize: 16,
	color: '#666',
	marginTop: 12
  },
  // Modal styles
  modalContainer: {
	flex: 1,
	backgroundColor: 'white'
  },
  modalHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	paddingHorizontal: 20,
	paddingVertical: 15,
	borderBottomWidth: 1,
	borderBottomColor: '#e0e0e0'
  },
  modalTitle: {
	fontSize: 18,
	fontWeight: 'bold',
	color: '#333'
  },
  cancelButton: {
	fontSize: 16,
	color: '#f44336'
  },
  saveButton: {
	fontSize: 16,
	color: '#2c5aa0',
	fontWeight: '500'
  },
  modalContent: {
	flex: 1,
	padding: 20
  },
  inputGroup: {
	marginBottom: 20
  },
  inputLabel: {
	fontSize: 16,
	fontWeight: '500',
	color: '#333',
	marginBottom: 8
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
	height: 120,
	textAlignVertical: 'top'
  },
  uploadButton: {
	flexDirection: 'row',
	alignItems: 'center',
	justifyContent: 'center',
	paddingVertical: 12,
	borderWidth: 1,
	borderColor: '#2c5aa0',
	borderRadius: 8,
	borderStyle: 'dashed',
	gap: 8
  },
  uploadButtonText: {
	color: '#2c5aa0',
	fontSize: 16
  },
  attachedFile: {
	flexDirection: 'row',
	alignItems: 'center',
	paddingVertical: 8,
	paddingHorizontal: 12,
	backgroundColor: '#f0f0f0',
	borderRadius: 6,
	marginTop: 8,
	gap: 8
  },
  fileName: {
	flex: 1,
	fontSize: 14,
	color: '#333'
  }
});
