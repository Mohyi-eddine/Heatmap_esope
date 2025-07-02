import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileSpreadsheet, Users, MapPin, TrendingUp, Home, School, AlertCircle, RefreshCw } from 'lucide-react';
import { loadJsonData, parseExcelData, addCustomStudentData, StudentData } from './utils/dataParser';
import 'leaflet/dist/leaflet.css';

interface ConcentrationData {
  zone: string;
  count: number;
  students: StudentData[];
  coordinates: [number, number];
  type: 'domicile' | 'etablissement';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

function App() {
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [domicileData, setDomicileData] = useState<ConcentrationData[]>([]);
  const [etablissementData, setEtablissementData] = useState<ConcentrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'json' | 'excel' | 'custom'>('json');
  const [activeMap, setActiveMap] = useState<'domicile' | 'etablissement'>('domicile');
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    loadData();
  }, [dataSource]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Début du chargement des données, source:', dataSource);
      
      let data: StudentData[] = [];
      
      if (dataSource === 'json') {
        try {
          data = await loadJsonData();
          console.log('✅ Données JSON chargées:', data.length, 'étudiants');
        } catch (error) {
          console.warn('⚠️ Impossible de charger le fichier JSON, utilisation des données d\'exemple');
          console.error('Détails de l\'erreur:', error);
          setError(`Erreur JSON: ${error.message}`);
          data = getExampleData();
        }
      } else if (dataSource === 'excel') {
        try {
          data = await parseExcelData();
        } catch (error) {
          console.warn('⚠️ Impossible de charger les fichiers Excel, utilisation des données d\'exemple');
          setError(`Erreur Excel: ${error.message}`);
          data = getExampleData();
        }
      } else {
        data = getCustomData();
      }

      if (data.length === 0) {
        setError('Aucune donnée valide trouvée dans le fichier');
        data = getExampleData();
      }

      console.log('📊 Données finales:', data.length, 'étudiants');
      setStudentData(data);
      
      // Grouper les données par domicile
      const domicileGroups = data.reduce((acc, student) => {
        if (!student.coordinatesDomicile) return acc;
        
        const key = `${student.coordinatesDomicile[0]},${student.coordinatesDomicile[1]}`;
        if (!acc[key]) {
          acc[key] = {
            zone: student.ville || student.adresseDomicile || 'Ville inconnue',
            count: 0,
            students: [],
            coordinates: student.coordinatesDomicile,
            type: 'domicile' as const
          };
        }
        acc[key].count++;
        acc[key].students.push(student);
        return acc;
      }, {} as { [key: string]: ConcentrationData });

      // Grouper les données par établissement
      const etablissementGroups = data.reduce((acc, student) => {
        if (!student.coordinatesEtablissement) return acc;
        
        const key = `${student.coordinatesEtablissement[0]},${student.coordinatesEtablissement[1]}`;
        if (!acc[key]) {
          acc[key] = {
            zone: student.adresseEtablissement || 'Établissement inconnu',
            count: 0,
            students: [],
            coordinates: student.coordinatesEtablissement,
            type: 'etablissement' as const
          };
        }
        acc[key].count++;
        acc[key].students.push(student);
        return acc;
      }, {} as { [key: string]: ConcentrationData });

      const domicileArray = Object.values(domicileGroups);
      const etablissementArray = Object.values(etablissementGroups);
      
      console.log('🏠 Données domicile groupées:', domicileArray.length, 'zones');
      console.log('🏫 Données établissement groupées:', etablissementArray.length, 'zones');
      
      setDomicileData(domicileArray);
      setEtablissementData(etablissementArray);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      setError(`Erreur lors du chargement: ${error.message}`);
      setLoading(false);
    }
  };

  // Fonction pour vos données personnalisées
  const getCustomData = (): StudentData[] => {
    const customStudents: StudentData[] = [
      {
        adresseDomicile: '8 boulevard Canebière, 13001 Marseille',
        adresseEtablissement: 'Université Aix-Marseille',
        ville: 'Marseille',
        codePostal: '13001',
        coordinatesDomicile: [43.2965, 5.3698],
        coordinatesEtablissement: [43.2951, 5.3656],
        id: 'Étudiant Marseille 1'
      },
      // Ajoutez ici toutes vos autres données...
    ];

    return addCustomStudentData(customStudents);
  };

  // Données d'exemple pour le fallback
  const getExampleData = (): StudentData[] => {
    return [
      {
        nom: 'Dupont',
        prenom: 'Marie',
        id: 'Marie Dupont',
        adresseDomicile: '15 rue de la Paix, 75001 Paris',
        adresseEtablissement: 'Université Paris 1',
        ville: 'Paris',
        codePostal: '75001',
        coordinatesDomicile: [48.8566, 2.3522],
        coordinatesEtablissement: [48.8467, 2.3431]
      },
      {
        nom: 'Martin',
        prenom: 'Pierre',
        id: 'Pierre Martin',
        adresseDomicile: '23 avenue Victor Hugo, 69003 Lyon',
        adresseEtablissement: 'Université Lyon 3',
        ville: 'Lyon',
        codePostal: '69003',
        coordinatesDomicile: [45.7640, 4.8357],
        coordinatesEtablissement: [45.7578, 4.8320]
      },
      {
        nom: 'Bernard',
        prenom: 'Sophie',
        id: 'Sophie Bernard',
        adresseDomicile: '8 boulevard Canebière, 13001 Marseille',
        adresseEtablissement: 'Université Aix-Marseille',
        ville: 'Marseille',
        codePostal: '13001',
        coordinatesDomicile: [43.2965, 5.3698],
        coordinatesEtablissement: [43.2951, 5.3656]
      },
      {
        nom: 'Dubois',
        prenom: 'Jean',
        id: 'Jean Dubois',
        adresseDomicile: '45 rue Alsace Lorraine, 31000 Toulouse',
        adresseEtablissement: 'Université Toulouse 1',
        ville: 'Toulouse',
        codePostal: '31000',
        coordinatesDomicile: [43.6047, 1.4442],
        coordinatesEtablissement: [43.6043, 1.4437]
      },
      {
        nom: 'Thomas',
        prenom: 'Emma',
        id: 'Emma Thomas',
        adresseDomicile: '12 cours Mirabeau, 13100 Aix-en-Provence',
        adresseEtablissement: 'Université Aix-Marseille',
        ville: 'Aix-en-Provence',
        codePostal: '13100',
        coordinatesDomicile: [43.5263, 5.4454],
        coordinatesEtablissement: [43.2951, 5.3656]
      }
    ];
  };

  const getCurrentData = () => {
    return activeMap === 'domicile' ? domicileData : etablissementData;
  };

  const getMarkerSize = (count: number, data: ConcentrationData[]) => {
    const maxCount = Math.max(...data.map(z => z.count));
    return Math.max(8, (count / maxCount) * 40);
  };

  const getMarkerColor = (count: number) => {
    if (count >= 5) return '#FF4444';
    if (count >= 3) return '#FF8844';
    if (count >= 2) return '#FFAA44';
    return '#44AA44';
  };

  // Fonction pour afficher l'identifiant d'un étudiant
  const getStudentDisplayName = (student: StudentData) => {
    return student.id || `${student.prenom || ''} ${student.nom || ''}`.trim() || 'Étudiant';
  };

  const currentData = getCurrentData();
  const totalStudents = studentData.length;
  const averagePerZone = currentData.length > 0 ? (totalStudents / currentData.length).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-3 rounded-lg">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Heatmap Étudiants ESOPE</h1>
                <p className="text-gray-600">Visualisation de la répartition géographique des étudiants</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{totalStudents}</div>
                <div className="text-sm text-gray-500">Étudiants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{currentData.length}</div>
                <div className="text-sm text-gray-500">
                  {activeMap === 'domicile' ? 'Domiciles' : 'Établissements'}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {setDataSource('json'); loadData();}}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dataSource === 'json' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Fichier JSON
                </button>
                <button
                  onClick={() => {setDataSource('excel'); loadData();}}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dataSource === 'excel' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Fichiers Excel
                </button>
                <button
                  onClick={() => {setDataSource('custom'); loadData();}}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dataSource === 'custom' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Données Personnalisées
                </button>
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  title="Mode debug"
                >
                  🔍
                </button>
              </div>
            </div>
          </div>
          
          {/* Message d'erreur */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Problème de chargement des données</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                  <p className="text-red-600 text-sm">Utilisation des données d'exemple en attendant.</p>
                </div>
                <button
                  onClick={() => loadData()}
                  className="ml-4 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center space-x-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Réessayer</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Mode debug */}
          {debugMode && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Mode Debug - Informations techniques</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Source de données:</strong> {dataSource}</p>
                <p><strong>Étudiants chargés:</strong> {studentData.length}</p>
                <p><strong>Domiciles avec coordonnées:</strong> {studentData.filter(s => s.coordinatesDomicile).length}</p>
                <p><strong>Établissements avec coordonnées:</strong> {studentData.filter(s => s.coordinatesEtablissement).length}</p>
                <p><strong>Zones domicile:</strong> {domicileData.length}</p>
                <p><strong>Zones établissement:</strong> {etablissementData.length}</p>
                <p className="text-xs mt-2">Consultez la console du navigateur (F12) pour plus de détails.</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toggle Maps */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white rounded-xl shadow-lg p-2 flex space-x-2">
            <button
              onClick={() => setActiveMap('domicile')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeMap === 'domicile'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Concentration par Domicile</span>
            </button>
            <button
              onClick={() => setActiveMap('etablissement')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeMap === 'etablissement'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <School className="h-4 w-4" />
              <span>Concentration par Établissement</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Étudiants</p>
                <p className="text-2xl font-semibold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              {activeMap === 'domicile' ? (
                <Home className="h-8 w-8 text-green-500" />
              ) : (
                <School className="h-8 w-8 text-green-500" />
              )}
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {activeMap === 'domicile' ? 'Domiciles Uniques' : 'Établissements Uniques'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{currentData.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Moyenne par Zone</p>
                <p className="text-2xl font-semibold text-gray-900">{averagePerZone}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <FileSpreadsheet className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Concentration Max</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentData.length > 0 ? Math.max(...currentData.map(z => z.count)) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Carte */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Carte de Concentration - {activeMap === 'domicile' ? 'Domiciles' : 'Établissements'}
                </h2>
                <p className="text-gray-600">
                  Répartition géographique des étudiants par {activeMap === 'domicile' ? 'lieu de domicile' : 'établissement scolaire'}
                </p>
                {currentData.length === 0 && (
                  <div className="mt-2 text-orange-600 text-sm">
                    Aucune donnée de géolocalisation disponible pour cette vue
                  </div>
                )}
              </div>
              <div className="h-96">
                <MapContainer
                  center={[46.603354, 1.888334]}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  className="rounded-b-xl"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {currentData.map((zone, index) => (
                    <CircleMarker
                      key={`${zone.coordinates[0]}-${zone.coordinates[1]}-${index}`}
                      center={zone.coordinates}
                      radius={getMarkerSize(zone.count, currentData)}
                      fillColor={getMarkerColor(zone.count)}
                      color="#fff"
                      weight={2}
                      opacity={1}
                      fillOpacity={0.7}
                      eventHandlers={{
                        click: () => setSelectedZone(zone.zone)
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-semibold text-lg">{zone.zone}</h3>
                          <p className="text-gray-600">{zone.count} étudiant{zone.count > 1 ? 's' : ''}</p>
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            {zone.students.slice(0, 5).map((student, idx) => (
                              <div key={idx} className="text-sm">
                                {getStudentDisplayName(student)}
                              </div>
                            ))}
                            {zone.students.length > 5 && (
                              <div className="text-sm text-gray-500">
                                ... et {zone.students.length - 5} autre{zone.students.length - 5 > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                      <Tooltip>
                        <span>{zone.zone}: {zone.count} étudiant{zone.count > 1 ? 's' : ''}</span>
                      </Tooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Tableau et Graphiques */}
          <div className="space-y-6">
            {/* Graphique en barres */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Répartition par {activeMap === 'domicile' ? 'Domicile' : 'Établissement'}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={currentData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="zone" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                    interval={0}
                  />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar 
                    dataKey="count" 
                    fill={activeMap === 'domicile' ? '#3B82F6' : '#10B981'} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique en secteurs */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={currentData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ count }) => count}
                  >
                    {currentData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tableau récapitulatif */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Tableau Récapitulatif</h3>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {activeMap === 'domicile' ? 'Domicile' : 'Établissement'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Étudiants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentData
                      .sort((a, b) => b.count - a.count)
                      .map((zone, index) => (
                        <tr 
                          key={`${zone.zone}-${index}`}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedZone === zone.zone ? 'bg-indigo-50' : ''
                          }`}
                          onClick={() => setSelectedZone(selectedZone === zone.zone ? null : zone.zone)}
                        >
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div className="truncate max-w-xs" title={zone.zone}>
                              {zone.zone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              activeMap === 'domicile' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {zone.count}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {((zone.count / totalStudents) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Détails de la zone sélectionnée */}
        {selectedZone && (
          <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Détails - {selectedZone}
              </h3>
              <button
                onClick={() => setSelectedZone(null)}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Fermer les détails
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentData
                  .find(z => z.zone === selectedZone)
                  ?.students.map((student, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">
                        {getStudentDisplayName(student)}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Domicile:</strong> {student.adresseDomicile}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Établissement:</strong> {student.adresseEtablissement}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;