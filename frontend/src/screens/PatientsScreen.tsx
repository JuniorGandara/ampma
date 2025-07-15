import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email?: string;
  age: number;
  gender: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  city?: string;
  isActive: boolean;
  createdAt: string;
  assignedTo?: {
	firstName: string;
	lastName: string;
  };
  _count: {
	medicalRecords: number;
	appointments: number;
	treatments: number;
	invoices: number;
  };
}

interface FilterOptions {
  search: string;
  gender: string;
  city: string;
  isActive: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function PatientsScreen({ navigation, route }: any) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
	current: 1,
	total: 1,
	totalRecords: 0
  });

  const [filters, setFilters] = useState<FilterOptions>({
	search: '',
	gender: '',
	city: '',
	isActive: true,
	sortBy: 'createdAt',
	sortOrder: 'desc'
  });

  // Cargar pacientes
  const loadPatients = async (page = 1, newFilters = filters) => {
	try {
  	const params = new URLSearchParams({
    	page: page.toString(),
    	limit: '10',
    	search: newFilters.search,
    	isActive: newFilters.isActive.toString(),
    	sortBy: newFilters.sortBy,
    	sortOrder: newFilters.sortOrder,
    	...(newFilters.gender && { gender: newFilters.gender }),
    	...(newFilters.city && { city: newFilters.city })
  	});

  	const response = await fetch(`${process.env.API_BASE_URL}/patients?${params}`, {
    	headers: {
      	'Authorization': `Bearer ${global.authToken}`,
      	'Content-Type': 'application/json'
    	}
  	});

  	if (!response.ok) {
    	throw new Error(`Error: ${response.status}`);
  	}

  	const data = await response.json();
 	 
  	if (page === 1) {
    	setPatients(data.patients);
  	} else {
    	setPatients(prev => [...prev, ...data.patients]);
  	}
 	 
  	setPagination(data.pagination);

	} catch (error) {
  	console.error('Error cargando pacientes:', error);
  	Alert.alert('Error', 'No se pudieron cargar los pacientes');
	} finally {
  	setLoading(false);
  	setRefreshing(false);
	}
  };

  // Cargar más pacientes (paginación)
  const loadMorePatients = () => {
	if (pagination.hasNext && !loading) {
  	setLoading(true);
  	loadPatients(pagination.current + 1);
	}
  };

  // Refrescar lista
  const onRefresh = useCallback(() => {
	setRefreshing(true);
	loadPatients(1);
  }, [filters]);

  // Aplicar filtros
  const applyFilters = () => {
	setShowFilters(false);
	setLoading(true);
	loadPatients(1, filters);
  };

  // Limpiar filtros
  const clearFilters = () => {
	const defaultFilters = {
  	search: '',
  	gender: '',
  	city: '',
  	isActive: true,
  	sortBy: 'createdAt',
  	sortOrder: 'desc' as 'desc'
	};
	setFilters(defaultFilters);
  };

  // Navegar a detalles del paciente
  const goToPatientDetails = (patient: Patient) => {
	navigation.navigate('PatientDetails', { patientId: patient.id });
  };

  // Navegar a crear paciente
  const goToCreatePatient = () => {
	navigation.navigate('CreatePatient');
  };

  // Efecto para cargar datos al enfocar
  useFocusEffect(
	useCallback(() => {
  	loadPatients(1);
	}, [])
  );

  // Renderizar item de paciente
  const renderPatientItem = ({ item: patient }: { item: Patient }) => (
	<TouchableOpacity
  	style={[styles.patientCard, !patient.isActive && styles.inactiveCard]}
  	onPress={() => goToPatientDetails(patient)}
	>
  	<View style={styles.patientHeader}>
    	<View style={styles.patientInfo}>
      	<Text style={styles.patientName}>
        	{patient.firstName} {patient.lastName}
      	</Text>
      	<Text style={styles.patientDetails}>
        	DNI: {patient.dni} • {patient.age} años
      	</Text>
      	<Text style={styles.patientContact}>
        	📱 {patient.phone}
        	{patient.email && ` • ✉️ ${patient.email}`}
      	</Text>
    	</View>
   	 
    	<View style={styles.patientStats}>
      	<Text style={styles.genderBadge}>{patient.gender}</Text>
      	{patient.city && (
        	<Text style={styles.cityBadge}>📍 {patient.city}</Text>
      	)}
    	</View>
  	</View>

  	<View style={styles.patientMetrics}>
    	<View style={styles.metricItem}>
      	<Ionicons name="folder-outline" size={16} color="#666" />
      	<Text style={styles.metricText}>{patient._count.medicalRecords}</Text>
    	</View>
    	<View style={styles.metricItem}>
      	<Ionicons name="calendar-outline" size={16} color="#666" />
      	<Text style={styles.metricText}>{patient._count.appointments}</Text>
    	</View>
    	<View style={styles.metricItem}>
      	<Ionicons name="medical-outline" size={16} color="#666" />
      	<Text style={styles.metricText}>{patient._count.treatments}</Text>
    	</View>
    	<View style={styles.metricItem}>
      	<Ionicons name="receipt-outline" size={16} color="#666" />
      	<Text style={styles.metricText}>{patient._count.invoices}</Text>
    	</View>
  	</View>

  	{patient.assignedTo && (
    	<Text style={styles.assignedTo}>
      	Asignado a: Dr/a. {patient.assignedTo.firstName} {patient.assignedTo.lastName}
    	</Text>
  	)}

  	<Text style={styles.createdDate}>
    	Registrado: {format(new Date(patient.createdAt), "dd 'de' MMM, yyyy", { locale: es })}
  	</Text>
	</TouchableOpacity>
  );

  // Renderizar modal de filtros
  const renderFiltersModal = () => (
	<Modal
  	visible={showFilters}
  	animationType="slide"
  	transparent={true}
  	onRequestClose={() => setShowFilters(false)}
	>
  	<View style={styles.modalOverlay}>
    	<View style={styles.filtersModal}>
      	<View style={styles.modalHeader}>
        	<Text style={styles.modalTitle}>Filtros</Text>
        	<TouchableOpacity onPress={() => setShowFilters(false)}>
          	<Ionicons name="close" size={24} color="#333" />
        	</TouchableOpacity>
      	</View>

      	<ScrollView style={styles.filtersContent}>
        	{/* Búsqueda */}
        	<View style={styles.filterGroup}>
          	<Text style={styles.filterLabel}>Buscar</Text>
          	<TextInput
            	style={styles.filterInput}
            	value={filters.search}
            	onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
            	placeholder="Nombre, DNI, teléfono..."
          	/>
        	</View>

        	{/* Género */}
        	<View style={styles.filterGroup}>
          	<Text style={styles.filterLabel}>Género</Text>
          	<View style={styles.radioGroup}>
            	{['', 'MASCULINO', 'FEMENINO', 'OTRO'].map((gender) => (
              	<TouchableOpacity
                	key={gender}
                	style={styles.radioOption}
                	onPress={() => setFilters(prev => ({ ...prev, gender }))}
              	>
                	<View style={[
                  	styles.radioCircle,
                  	filters.gender === gender && styles.radioSelected
                	]} />
                	<Text style={styles.radioLabel}>
                  	{gender || 'Todos'}
                	</Text>
              	</TouchableOpacity>
            	))}
          	</View>
        	</View>

        	{/* Ciudad */}
        	<View style={styles.filterGroup}>
          	<Text style={styles.filterLabel}>Ciudad</Text>
          	<TextInput
            	style={styles.filterInput}
            	value={filters.city}
            	onChangeText={(text) => setFilters(prev => ({ ...prev, city: text }))}
            	placeholder="Córdoba, Villa María..."
          	/>
        	</View>

        	{/* Estado */}
        	<View style={styles.filterGroup}>
          	<Text style={styles.filterLabel}>Estado</Text>
          	<View style={styles.radioGroup}>
            	<TouchableOpacity
              	style={styles.radioOption}
              	onPress={() => setFilters(prev => ({ ...prev, isActive: true }))}
            	>
              	<View style={[
                	styles.radioCircle,
                	filters.isActive && styles.radioSelected
              	]} />
              	<Text style={styles.radioLabel}>Activos</Text>
            	</TouchableOpacity>
            	<TouchableOpacity
              	style={styles.radioOption}
              	onPress={() => setFilters(prev => ({ ...prev, isActive: false }))}
            	>
              	<View style={[
                	styles.radioCircle,
                	!filters.isActive && styles.radioSelected
              	]} />
              	<Text style={styles.radioLabel}>Inactivos</Text>
            	</TouchableOpacity>
          	</View>
        	</View>

        	{/* Ordenamiento */}
        	<View style={styles.filterGroup}>
          	<Text style={styles.filterLabel}>Ordenar por</Text>
          	<View style={styles.radioGroup}>
            	{[
              	{ key: 'createdAt', label: 'Fecha de registro' },
              	{ key: 'firstName', label: 'Nombre' },
              	{ key: 'lastName', label: 'Apellido' },
              	{ key: 'updatedAt', label: 'Última actualización' }
            	].map((option) => (
              	<TouchableOpacity
                	key={option.key}
                	style={styles.radioOption}
                	onPress={() => setFilters(prev => ({ ...prev, sortBy: option.key }))}
              	>
                	<View style={[
                  	styles.radioCircle,
                  	filters.sortBy === option.key && styles.radioSelected
                	]} />
                	<Text style={styles.radioLabel}>{option.label}</Text>
              	</TouchableOpacity>
            	))}
          	</View>
        	</View>
      	</ScrollView>

      	<View style={styles.modalActions}>
        	<TouchableOpacity
          	style={styles.clearButton}
          	onPress={clearFilters}
        	>
          	<Text style={styles.clearButtonText}>Limpiar</Text>
        	</TouchableOpacity>
        	<TouchableOpacity
          	style={styles.applyButton}
          	onPress={applyFilters}
        	>
          	<Text style={styles.applyButtonText}>Aplicar</Text>
        	</TouchableOpacity>
      	</View>
    	</View>
  	</View>
	</Modal>
  );

  if (loading && patients.length === 0) {
	return (
  	<View style={styles.loadingContainer}>
    	<ActivityIndicator size="large" color="#2c5aa0" />
    	<Text style={styles.loadingText}>Cargando pacientes...</Text>
  	</View>
	);
  }

  return (
	<View style={styles.container}>
  	{/* Header */}
  	<View style={styles.header}>
    	<Text style={styles.title}>Pacientes</Text>
    	<View style={styles.headerActions}>
      	<TouchableOpacity
        	style={styles.filterButton}
        	onPress={() => setShowFilters(true)}
      	>
        	<Ionicons name="filter" size={20} color="#2c5aa0" />
      	</TouchableOpacity>
      	<TouchableOpacity
        	style={styles.addButton}
        	onPress={goToCreatePatient}
      	>
        	<Ionicons name="add" size={20} color="white" />
      	</TouchableOpacity>
    	</View>
  	</View>

  	{/* Estadísticas rápidas */}
  	<View style={styles.quickStats}>
    	<Text style={styles.statsText}>
      	{pagination.totalRecords} pacientes
      	{filters.search && ` • "${filters.search}"`}
    	</Text>
  	</View>

  	{/* Lista de pacientes */}
  	<FlatList
    	data={patients}
    	renderItem={renderPatientItem}
    	keyExtractor={(item) => item.id}
    	refreshControl={
      	<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    	}
    	onEndReached={loadMorePatients}
    	onEndReachedThreshold={0.1}
    	ListFooterComponent={
      	loading && patients.length > 0 ? (
        	<ActivityIndicator style={styles.loadingMore} size="small" color="#2c5aa0" />
      	) : null
    	}
    	ListEmptyComponent={
      	!loading ? (
        	<View style={styles.emptyContainer}>
          	<Ionicons name="people-outline" size={64} color="#ccc" />
          	<Text style={styles.emptyText}>No se encontraron pacientes</Text>
          	<TouchableOpacity
            	style={styles.createFirstButton}
            	onPress={goToCreatePatient}
          	>
            	<Text style={styles.createFirstButtonText}>Crear primer paciente</Text>
          	</TouchableOpacity>
        	</View>
      	) : null
    	}
    	contentContainerStyle={styles.listContainer}
  	/>

  	{/* Modal de filtros */}
  	{renderFiltersModal()}
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
	alignItems: 'center',
	backgroundColor: '#f5f5f5'
  },
  loadingText: {
	marginTop: 10,
	fontSize: 16,
	color: '#666'
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
  title: {
	fontSize: 24,
	fontWeight: 'bold',
	color: '#333'
  },
  headerActions: {
	flexDirection: 'row',
	gap: 10
  },
  filterButton: {
	padding: 8,
	borderRadius: 8,
	backgroundColor: '#f0f0f0'
  },
  addButton: {
	backgroundColor: '#2c5aa0',
	paddingHorizontal: 16,
	paddingVertical: 8,
	borderRadius: 8,
	flexDirection: 'row',
	alignItems: 'center'
  },
  quickStats: {
	paddingHorizontal: 20,
	paddingVertical: 10,
	backgroundColor: 'white'
  },
  statsText: {
	fontSize: 14,
	color: '#666'
  },
  listContainer: {
	paddingHorizontal: 20,
	paddingBottom: 20
  },
  patientCard: {
	backgroundColor: 'white',
	borderRadius: 12,
	padding: 16,
	marginVertical: 6,
	shadowColor: '#000',
	shadowOffset: { width: 0, height: 2 },
	shadowOpacity: 0.1,
	shadowRadius: 4,
	elevation: 3
  },
  inactiveCard: {
	opacity: 0.6,
	backgroundColor: '#f8f8f8'
  },
  patientHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	marginBottom: 12
  },
  patientInfo: {
	flex: 1
  },
  patientName: {
	fontSize: 18,
	fontWeight: 'bold',
	color: '#333',
	marginBottom: 4
  },
  patientDetails: {
	fontSize: 14,
	color: '#666',
	marginBottom: 2
  },
  patientContact: {
	fontSize: 14,
	color: '#666'
  },
  patientStats: {
	alignItems: 'flex-end'
  },
  genderBadge: {
	backgroundColor: '#e3f2fd',
	color: '#1976d2',
	paddingHorizontal: 8,
	paddingVertical: 4,
	borderRadius: 12,
	fontSize: 12,
	fontWeight: '500',
	marginBottom: 4
  },
  cityBadge: {
	fontSize: 12,
	color: '#666'
  },
  patientMetrics: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	paddingVertical: 8,
	borderTopWidth: 1,
	borderTopColor: '#f0f0f0',
	marginBottom: 8
  },
  metricItem: {
	flexDirection: 'row',
	alignItems: 'center',
	gap: 4
  },
  metricText: {
	fontSize: 14,
	color: '#666'
  },
  assignedTo: {
	fontSize: 12,
	color: '#2c5aa0',
	fontWeight: '500',
	marginBottom: 4
  },
  createdDate: {
	fontSize: 12,
	color: '#999'
  },
  loadingMore: {
	marginVertical: 20
  },
  emptyContainer: {
	flex: 1,
	justifyContent: 'center',
	alignItems: 'center',
	paddingVertical: 60
  },
  emptyText: {
	fontSize: 16,
	color: '#666',
	marginTop: 16,
	marginBottom: 20
  },
  createFirstButton: {
	backgroundColor: '#2c5aa0',
	paddingHorizontal: 20,
	paddingVertical: 12,
	borderRadius: 8
  },
  createFirstButtonText: {
	color: 'white',
	fontSize: 16,
	fontWeight: '500'
  },
  // Modal styles
  modalOverlay: {
	flex: 1,
	backgroundColor: 'rgba(0,0,0,0.5)',
	justifyContent: 'flex-end'
  },
  filtersModal: {
	backgroundColor: 'white',
	borderTopLeftRadius: 20,
	borderTopRightRadius: 20,
	maxHeight: '80%'
  },
  modalHeader: {
	flexDirection: 'row',
	justifyContent: 'space-between',
	alignItems: 'center',
	padding: 20,
	borderBottomWidth: 1,
	borderBottomColor: '#e0e0e0'
  },
  modalTitle: {
	fontSize: 20,
	fontWeight: 'bold',
	color: '#333'
  },
  filtersContent: {
	padding: 20
  },
  filterGroup: {
	marginBottom: 24
  },
  filterLabel: {
	fontSize: 16,
	fontWeight: '600',
	color: '#333',
	marginBottom: 12
  },
  filterInput: {
	borderWidth: 1,
	borderColor: '#ddd',
	borderRadius: 8,
	paddingHorizontal: 12,
	paddingVertical: 12,
	fontSize: 16,
	backgroundColor: '#fafafa'
  },
  radioGroup: {
	gap: 8
  },
  radioOption: {
	flexDirection: 'row',
	alignItems: 'center',
	paddingVertical: 8
  },
  radioCircle: {
	width: 20,
	height: 20,
	borderRadius: 10,
	borderWidth: 2,
	borderColor: '#ddd',
	marginRight: 12
  },
  radioSelected: {
	borderColor: '#2c5aa0',
	backgroundColor: '#2c5aa0'
  },
  radioLabel: {
	fontSize: 16,
	color: '#333'
  },
  modalActions: {
	flexDirection: 'row',
	padding: 20,
	borderTopWidth: 1,
	borderTopColor: '#e0e0e0',
	gap: 12
  },
  clearButton: {
	flex: 1,
	paddingVertical: 12,
	borderRadius: 8,
	borderWidth: 1,
	borderColor: '#ddd',
	alignItems: 'center'
  },
  clearButtonText: {
	fontSize: 16,
	color: '#666'
  },
  applyButton: {
	flex: 1,
	backgroundColor: '#2c5aa0',
	paddingVertical: 12,
	borderRadius: 8,
	alignItems: 'center'
  },
  applyButtonText: {
	fontSize: 16,
	color: 'white',
	fontWeight: '500'
  }
