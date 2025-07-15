};

const styles = StyleSheet.create({
  container: {
	flex: 1,
	backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
	flex: 1,
	justifyContent: 'center',
	alignItems: 'center',
  },
  loadingText: {
	marginTop: 10,
	color: '#666',
	fontSize: 16,
  },
  header: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: 16,
	backgroundColor: 'white',
	borderBottomWidth: 1,
	borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
	fontSize: 24,
	fontWeight: 'bold',
	color: '#2d3748',
  },
  headerButtons: {
	flexDirection: 'row',
	alignItems: 'center',
  },
  viewModeBtn: {
	paddingHorizontal: 12,
	paddingVertical: 6,
	marginRight: 8,
	backgroundColor: '#f7fafc',
	borderRadius: 16,
	borderWidth: 1,
	borderColor: '#e2e8f0',
  },
  viewModeBtnActive: {
	backgroundColor: '#007bff',
	borderColor: '#007bff',
  },
  viewModeBtnText: {
	fontSize: 14,
	color: '#4a5568',
  },
  viewModeBtnTextActive: {
	color: 'white',
  },
  createBtn: {
	backgroundColor: '#28a745',
	borderRadius: 20,
	width: 40,
	height: 40,
	justifyContent: 'center',
	alignItems: 'center',
  },
  content: {
	flex: 1,
  },
  calendar: {
	borderBottomWidth: 1,
	borderBottomColor: '#e2e8f0',
  },
  selectedDateContainer: {
	padding: 16,
	backgroundColor: 'white',
	borderBottomWidth: 1,
	borderBottomColor: '#e2e8f0',
  },
  selectedDateText: {
	fontSize: 18,
	fontWeight: '600',
	color: '#2d3748',
	textTransform: 'capitalize',
  },
  appointmentsContainer: {
	padding: 16,
  },
  emptyContainer: {
	alignItems: 'center',
	justifyContent: 'center',
	paddingVertical: 60,
  },
  emptyText: {
	fontSize: 18,
	color: '#a0aec0',
	marginTop: 16,
  },
  emptySubtext: {
	fontSize: 14,
	color: '#cbd5e0',
	marginTop: 4,
  },
  modalContainer: {
	flex: 1,
	backgroundColor: '#f8f9fa',
  },
  modalHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: 16,
	backgroundColor: 'white',
	borderBottomWidth: 1,
	borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
	fontSize: 20,
	fontWeight: 'bold',
	color: '#2d3748',
  },
  modalContent: {
	flex: 1,
	padding: 16,
  },
  section: {
	backgroundColor: 'white',
	borderRadius: 8,
	padding: 16,
	marginBottom: 16,
  },
  sectionTitle: {
	fontSize: 16,
	fontWeight: 'bold',
	color: '#2d3748',
	marginBottom: 12,
  },
  patientName: {
	fontSize: 18,
	fontWeight: '600',
	color: '#2d3748',
	marginBottom: 8,
  },
  patientInfo: {
	fontSize: 14,
	color: '#4a5568',
	marginBottom: 4,
  },
  treatmentName: {
	fontSize: 16,
	fontWeight: '600',
	color: '#2d3748',
	marginBottom: 8,
  },
  treatmentInfo: {
	fontSize: 14,
	color: '#4a5568',
	marginBottom: 4,
  },
  appointmentInfo: {
	fontSize: 14,
	color: '#4a5568',
	marginBottom: 8,
  },
  statusBadge: {
	alignSelf: 'flex-start',
	paddingHorizontal: 12,
	paddingVertical: 4,
	borderRadius: 12,
	marginTop: 8,
  },
  statusText: {
	color: 'white',
	fontSize: 12,
	fontWeight: 'bold',
  },
  notesContainer: {
	marginTop: 12,
	padding: 12,
	backgroundColor: '#f7fafc',
	borderRadius: 6,
  },
  notesTitle: {
	fontSize: 14,
	fontWeight: '600',
	color: '#2d3748',
	marginBottom: 4,
  },
  notesText: {
	fontSize: 14,
	color: '#4a5568',
	lineHeight: 20,
  },
  textInput: {
	borderWidth: 1,
	borderColor: '#e2e8f0',
	borderRadius: 6,
	padding: 12,
	fontSize: 16,
	backgroundColor: 'white',
	textAlignVertical: 'top',
  },
  formButtons: {
	flexDirection: 'row',
	justifyContent: 'flex-end',
	marginTop: 16,
  },
  button: {
	paddingHorizontal: 16,
	paddingVertical: 8,
	borderRadius: 6,
	marginLeft: 8,
  },
  buttonSecondary: {
	backgroundColor: '#f7fafc',
	borderWidth: 1,
	borderColor: '#e2e8f0',
  },
  buttonSecondaryText: {
	color: '#4a5568',
	fontWeight: '600',
  },
  buttonDanger: {
	backgroundColor: '#dc3545',
  },
  buttonSuccess: {
	backgroundColor: '#28a745',
  },
  buttonText: {
	color: 'white',
	fontWeight: '600',
  },
  actionButtons: {
	flexDirection: 'row',
	padding: 16,
	backgroundColor: 'white',
	borderTopWidth: 1,
	borderTopColor: '#e2e8f0',
  },
  actionButton: {
	flexDirection: 'row',
	alignItems: 'center',
	paddingHorizontal: 16,
	paddingVertical: 12,
	borderRadius: 8,
	marginRight: 8,
	flex: 1,
	justifyContent: 'center',
  },
  confirmButton: {
	backgroundColor: '#28a745',
  },
  completeButton: {
	backgroundColor: '#6f42c1',
  },
  cancelButton: {
	backgroundColor: '#dc3545',
  },
  actionButtonText: {
	color: 'white',
	fontWeight: '600',
	marginLeft: 4,
  },
});import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { appointmentService } from '../services/appointmentService';
import { patientService } from '../services/patientService';
import { treatmentService } from '../services/treatmentService';
import { AppointmentCard } from '../components/AppointmentCard';
import { CreateAppointmentModal } from '../components/CreateAppointmentModal';
import { useAuth } from '../hooks/useAuth';

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: 'PROGRAMADA' | 'CONFIRMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO';
  notes?: string;
  patient: {
	id: string;
	firstName: string;
	lastName: string;
	phone: string;
	email?: string;
  };
  treatment: {
	id: string;
	name: string;
	duration: number;
	price: number;
	category: string;
  };
  user: {
	id: string;
	firstName: string;
	lastName: string;
	role: string;
  };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Treatment {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
}

export const AgendaScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Cargar datos iniciales
  useFocusEffect(
	useCallback(() => {
  	loadInitialData();
	}, [])
  );

  const loadInitialData = async () => {
	setLoading(true);
	try {
  	await Promise.all([
    	loadAppointments(),
    	loadPatients(),
    	loadTreatments()
  	]);
	} catch (error) {
  	console.error('Error loading initial data:', error);
  	Alert.alert('Error', 'Error cargando datos iniciales');
	} finally {
  	setLoading(false);
	}
  };

  const loadAppointments = async () => {
	try {
  	const startDate = new Date(selectedDate);
  	const endDate = new Date(selectedDate);
 	 
  	if (viewMode === 'week') {
    	const startOfWeek = new Date(startDate);
    	startOfWeek.setDate(startDate.getDate() - startDate.getDay());
    	const endOfWeek = new Date(startOfWeek);
    	endOfWeek.setDate(startOfWeek.getDate() + 6);
   	 
    	startDate.setTime(startOfWeek.getTime());
    	endDate.setTime(endOfWeek.getTime());
  	} else if (viewMode === 'month') {
    	startDate.setDate(1);
    	endDate.setMonth(endDate.getMonth() + 1);
    	endDate.setDate(0);
  	}

  	endDate.setHours(23, 59, 59, 999);

  	const response = await appointmentService.getAppointments({
    	startDate: startDate.toISOString(),
    	endDate: endDate.toISOString()
  	});

  	setAppointments(response.appointments || []);
	} catch (error) {
  	console.error('Error loading appointments:', error);
  	throw error;
	}
  };

  const loadPatients = async () => {
	try {
  	const response = await patientService.getPatients({ limit: 100 });
  	setPatients(response.patients || []);
	} catch (error) {
  	console.error('Error loading patients:', error);
	}
  };

  const loadTreatments = async () => {
	try {
  	const response = await treatmentService.getTreatments({ limit: 100 });
  	setTreatments(response.treatments || []);
	} catch (error) {
  	console.error('Error loading treatments:', error);
	}
  };

  const onRefresh = useCallback(async () => {
	setRefreshing(true);
	try {
  	await loadAppointments();
	} catch (error) {
  	Alert.alert('Error', 'Error actualizando datos');
	} finally {
  	setRefreshing(false);
	}
  }, [selectedDate, viewMode]);

  const handleDateSelect = (date: DateData) => {
	setSelectedDate(date.dateString);
  };

  const handleCreateAppointment = async (appointmentData: any) => {
	try {
  	await appointmentService.createAppointment(appointmentData);
  	setCreateModalVisible(false);
  	await loadAppointments();
  	Alert.alert('Éxito', 'Cita creada exitosamente');
	} catch (error: any) {
  	Alert.alert('Error', error.message || 'Error creando cita');
	}
  };

  const handleAppointmentPress = (appointment: Appointment) => {
	setSelectedAppointment(appointment);
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
	try {
  	await appointmentService.updateAppointment(appointmentId, { status: newStatus });
  	await loadAppointments();
  	setSelectedAppointment(null);
  	Alert.alert('Éxito', 'Estado actualizado exitosamente');
	} catch (error: any) {
  	Alert.alert('Error', error.message || 'Error actualizando estado');
	}
  };

  const handleCancelAppointment = async (appointmentId: string, reason: string) => {
	try {
  	await appointmentService.cancelAppointment(appointmentId, { reason });
  	await loadAppointments();
  	setSelectedAppointment(null);
  	Alert.alert('Éxito', 'Cita cancelada exitosamente');
	} catch (error: any) {
  	Alert.alert('Error', error.message || 'Error cancelando cita');
	}
  };

  const handleCompleteAppointment = async (appointmentId: string, notes?: string) => {
	try {
  	await appointmentService.completeAppointment(appointmentId, { notes });
  	await loadAppointments();
  	setSelectedAppointment(null);
  	Alert.alert('Éxito', 'Cita completada exitosamente');
	} catch (error: any) {
  	Alert.alert('Error', error.message || 'Error completando cita');
	}
  };

  const getAppointmentsForSelectedDate = () => {
	return appointments.filter(apt => {
  	const aptDate = new Date(apt.startTime).toISOString().split('T')[0];
  	return aptDate === selectedDate;
	}).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const getMarkedDates = () => {
	const marked: any = {};
    
	// Marcar fecha seleccionada
	marked[selectedDate] = {
  	selected: true,
  	selectedColor: '#007bff',
	};

	// Marcar fechas con citas
	appointments.forEach(apt => {
  	const date = new Date(apt.startTime).toISOString().split('T')[0];
  	if (!marked[date]) {
    	marked[date] = {};
  	}
  	marked[date].marked = true;
  	marked[date].dotColor = getStatusColor(apt.status);
	});

	return marked;
  };

  const getStatusColor = (status: string) => {
	switch (status) {
  	case 'PROGRAMADA': return '#ffc107';
  	case 'CONFIRMADA': return '#28a745';
  	case 'EN_CURSO': return '#17a2b8';
  	case 'COMPLETADA': return '#6f42c1';
  	case 'CANCELADA': return '#dc3545';
  	case 'NO_ASISTIO': return '#fd7e14';
  	default: return '#6c757d';
	}
  };

  const canCreateAppointments = () => {
	return user?.role === 'ADMIN' || user?.role === 'MEDICO' || user?.role === 'SECRETARIA';
  };

  if (loading) {
	return (
  	<View style={styles.loadingContainer}>
    	<ActivityIndicator size="large" color="#007bff" />
    	<Text style={styles.loadingText}>Cargando agenda...</Text>
  	</View>
	);
  }

  return (
	<View style={styles.container}>
  	{/* Header */}
  	<View style={styles.header}>
    	<Text style={styles.headerTitle}>Agenda</Text>
    	<View style={styles.headerButtons}>
      	<TouchableOpacity
        	style={[styles.viewModeBtn, viewMode === 'day' && styles.viewModeBtnActive]}
        	onPress={() => setViewMode('day')}
      	>
        	<Text style={[styles.viewModeBtnText, viewMode === 'day' && styles.viewModeBtnTextActive]}>
          	Día
        	</Text>
      	</TouchableOpacity>
      	<TouchableOpacity
        	style={[styles.viewModeBtn, viewMode === 'week' && styles.viewModeBtnActive]}
        	onPress={() => setViewMode('week')}
      	>
        	<Text style={[styles.viewModeBtnText, viewMode === 'week' && styles.viewModeBtnTextActive]}>
          	Semana
        	</Text>
      	</TouchableOpacity>
      	{canCreateAppointments() && (
        	<TouchableOpacity
          	style={styles.createBtn}
          	onPress={() => setCreateModalVisible(true)}
        	>
          	<Ionicons name="add" size={24} color="white" />
        	</TouchableOpacity>
      	)}
    	</View>
  	</View>

  	<ScrollView
    	style={styles.content}
    	refreshControl={
      	<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    	}
  	>
    	{/* Calendar */}
    	<Calendar
      	style={styles.calendar}
      	onDayPress={handleDateSelect}
      	markedDates={getMarkedDates()}
      	firstDay={1}
      	enableSwipeMonths={true}
      	theme={{
        	selectedDayBackgroundColor: '#007bff',
        	selectedDayTextColor: '#ffffff',
        	todayTextColor: '#007bff',
        	dayTextColor: '#2d3748',
        	textDisabledColor: '#a0aec0',
        	arrowColor: '#007bff',
        	monthTextColor: '#2d3748',
        	indicatorColor: '#007bff',
        	textDayFontFamily: 'System',
        	textMonthFontFamily: 'System',
        	textDayHeaderFontFamily: 'System',
        	textDayFontSize: 16,
        	textMonthFontSize: 18,
        	textDayHeaderFontSize: 14
      	}}
    	/>

    	{/* Fecha seleccionada */}
    	<View style={styles.selectedDateContainer}>
      	<Text style={styles.selectedDateText}>
        	{new Date(selectedDate).toLocaleDateString('es-AR', {
          	weekday: 'long',
          	year: 'numeric',
          	month: 'long',
          	day: 'numeric'
        	})}
      	</Text>
    	</View>

    	{/* Lista de citas */}
    	<View style={styles.appointmentsContainer}>
      	{getAppointmentsForSelectedDate().length === 0 ? (
        	<View style={styles.emptyContainer}>
          	<Ionicons name="calendar-outline" size={64} color="#cbd5e0" />
          	<Text style={styles.emptyText}>No hay citas programadas</Text>
          	<Text style={styles.emptySubtext}>para esta fecha</Text>
        	</View>
      	) : (
        	getAppointmentsForSelectedDate().map((appointment) => (
          	<AppointmentCard
            	key={appointment.id}
            	appointment={appointment}
            	onPress={() => handleAppointmentPress(appointment)}
            	userRole={user?.role}
          	/>
        	))
      	)}
    	</View>
  	</ScrollView>

  	{/* Modal de crear cita */}
  	<CreateAppointmentModal
    	visible={createModalVisible}
    	onClose={() => setCreateModalVisible(false)}
    	onSubmit={handleCreateAppointment}
    	patients={patients}
    	treatments={treatments}
    	selectedDate={selectedDate}
  	/>

  	{/* Modal de detalle de cita */}
  	{selectedAppointment && (
    	<AppointmentDetailModal
      	appointment={selectedAppointment}
      	visible={!!selectedAppointment}
      	onClose={() => setSelectedAppointment(null)}
      	onStatusChange={handleStatusChange}
      	onCancel={handleCancelAppointment}
      	onComplete={handleCompleteAppointment}
      	userRole={user?.role}
    	/>
  	)}
	</View>
  );
};

// Modal de detalle de cita
interface AppointmentDetailModalProps {
  appointment: Appointment;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onCancel: (id: string, reason: string) => void;
  onComplete: (id: string, notes?: string) => void;
  userRole?: string;
}

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  visible,
  onClose,
  onStatusChange,
  onCancel,
  onComplete,
  userRole
}) => {
  const [cancelReason, setCancelReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const formatTime = (dateString: string) => {
	return new Date(dateString).toLocaleTimeString('es-AR', {
  	hour: '2-digit',
  	minute: '2-digit'
	});
  };

  const formatPrice = (price: number) => {
	return new Intl.NumberFormat('es-AR', {
  	style: 'currency',
  	currency: 'ARS'
	}).format(price);
  };

  const canModify = userRole === 'ADMIN' || userRole === 'MEDICO' || userRole === 'SECRETARIA';
  const canComplete = userRole === 'ADMIN' || userRole === 'MEDICO';

  const handleConfirm = () => {
	onStatusChange(appointment.id, 'CONFIRMADA');
  };

  const handleCancel = () => {
	if (!cancelReason.trim()) {
  	Alert.alert('Error', 'Debe proporcionar un motivo de cancelación');
  	return;
	}
	onCancel(appointment.id, cancelReason);
	setShowCancelForm(false);
	setCancelReason('');
  };

  const handleComplete = () => {
	onComplete(appointment.id, completionNotes);
	setShowCompleteForm(false);
	setCompletionNotes('');
  };

  return (
	<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
  	<View style={styles.modalContainer}>
    	<View style={styles.modalHeader}>
      	<Text style={styles.modalTitle}>Detalle de Cita</Text>
      	<TouchableOpacity onPress={onClose}>
        	<Ionicons name="close" size={24} color="#666" />
      	</TouchableOpacity>
    	</View>

    	<ScrollView style={styles.modalContent}>
      	{/* Información del paciente */}
      	<View style={styles.section}>
        	<Text style={styles.sectionTitle}>Paciente</Text>
        	<Text style={styles.patientName}>
          	{appointment.patient.firstName} {appointment.patient.lastName}
        	</Text>
        	<Text style={styles.patientInfo}>📞 {appointment.patient.phone}</Text>
        	{appointment.patient.email && (
          	<Text style={styles.patientInfo}>✉️ {appointment.patient.email}</Text>
        	)}
      	</View>

      	{/* Información del tratamiento */}
      	<View style={styles.section}>
        	<Text style={styles.sectionTitle}>Tratamiento</Text>
        	<Text style={styles.treatmentName}>{appointment.treatment.name}</Text>
        	<Text style={styles.treatmentInfo}>⏱️ {appointment.treatment.duration} minutos</Text>
        	<Text style={styles.treatmentInfo}>💰 {formatPrice(appointment.treatment.price)}</Text>
        	<Text style={styles.treatmentInfo}>🏷️ {appointment.treatment.category}</Text>
      	</View>

      	{/* Información de la cita */}
      	<View style={styles.section}>
        	<Text style={styles.sectionTitle}>Cita</Text>
        	<Text style={styles.appointmentInfo}>
          	📅 {new Date(appointment.startTime).toLocaleDateString('es-AR')}
        	</Text>
        	<Text style={styles.appointmentInfo}>
          	⏰ {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
        	</Text>
        	<Text style={styles.appointmentInfo}>
          	👨‍⚕️ {appointment.user.firstName} {appointment.user.lastName}
        	</Text>
        	<View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          	<Text style={styles.statusText}>{appointment.status}</Text>
        	</View>
        	{appointment.notes && (
          	<View style={styles.notesContainer}>
            	<Text style={styles.notesTitle}>Notas:</Text>
            	<Text style={styles.notesText}>{appointment.notes}</Text>
          	</View>
        	)}
      	</View>

      	{/* Formulario de cancelación */}
      	{showCancelForm && (
        	<View style={styles.section}>
          	<Text style={styles.sectionTitle}>Motivo de Cancelación</Text>
          	<TextInput
            	style={styles.textInput}
            	value={cancelReason}
            	onChangeText={setCancelReason}
            	placeholder="Ingrese el motivo de cancelación"
            	multiline
            	numberOfLines={3}
          	/>
          	<View style={styles.formButtons}>
            	<TouchableOpacity
              	style={[styles.button, styles.buttonSecondary]}
              	onPress={() => setShowCancelForm(false)}
            	>
              	<Text style={styles.buttonSecondaryText}>Cancelar</Text>
            	</TouchableOpacity>
            	<TouchableOpacity
              	style={[styles.button, styles.buttonDanger]}
              	onPress={handleCancel}
            	>
              	<Text style={styles.buttonText}>Confirmar Cancelación</Text>
            	</TouchableOpacity>
          	</View>
        	</View>
      	)}

      	{/* Formulario de completar */}
      	{showCompleteForm && (
        	<View style={styles.section}>
          	<Text style={styles.sectionTitle}>Notas de Finalización</Text>
          	<TextInput
            	style={styles.textInput}
            	value={completionNotes}
            	onChangeText={setCompletionNotes}
            	placeholder="Ingrese notas sobre el tratamiento (opcional)"
            	multiline
            	numberOfLines={4}
          	/>
          	<View style={styles.formButtons}>
            	<TouchableOpacity
              	style={[styles.button, styles.buttonSecondary]}
              	onPress={() => setShowCompleteForm(false)}
            	>
              	<Text style={styles.buttonSecondaryText}>Cancelar</Text>
            	</TouchableOpacity>
            	<TouchableOpacity
              	style={[styles.button, styles.buttonSuccess]}
              	onPress={handleComplete}
            	>
              	<Text style={styles.buttonText}>Completar Cita</Text>
            	</TouchableOpacity>
          	</View>
        	</View>
      	)}
    	</ScrollView>

    	{/* Botones de acción */}
    	{canModify && appointment.status !== 'COMPLETADA' && appointment.status !== 'CANCELADA' && (
      	<View style={styles.actionButtons}>
        	{appointment.status === 'PROGRAMADA' && (
          	<TouchableOpacity
            	style={[styles.actionButton, styles.confirmButton]}
            	onPress={handleConfirm}
          	>
            	<Ionicons name="checkmark" size={20} color="white" />
            	<Text style={styles.actionButtonText}>Confirmar</Text>
          	</TouchableOpacity>
        	)}

        	{canComplete && appointment.status === 'CONFIRMADA' && (
          	<TouchableOpacity
            	style={[styles.actionButton, styles.completeButton]}
            	onPress={() => setShowCompleteForm(true)}
          	>
            	<Ionicons name="checkmark-done" size={20} color="white" />
            	<Text style={styles.actionButtonText}>Completar</Text>
          	</TouchableOpacity>
        	)}

        	<TouchableOpacity
          	style={[styles.actionButton, styles.cancelButton]}
          	onPress={() => setShowCancelForm(true)}
        	>
          	<Ionicons name="close" size={20} color="white" />
          	<Text style={styles.actionButtonText}>Cancelar</Text>
        	</TouchableOpacity>
      	</View>
    	)}
  	</View>
	</Modal>
  );
};
