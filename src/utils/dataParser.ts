export interface StudentData {
  nom?: string;
  prenom?: string;
  adresseDomicile: string;
  adresseEtablissement: string;
  ville: string;
  codePostal: string;
  coordinatesDomicile?: [number, number];
  coordinatesEtablissement?: [number, number];
  // Ajout d'un identifiant unique pour l'affichage
  id?: string;
}

// Fonction pour charger les données depuis le fichier JSON
export async function loadJsonData(): Promise<StudentData[]> {
  try {
    console.log('🔍 Tentative de chargement du fichier JSON...');
    
    const response = await fetch('/data/personnes.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
    }
    
    // Récupérer le contenu comme texte d'abord
    const textContent = await response.text();
    console.log('📄 Taille du fichier:', textContent.length, 'caractères');
    console.log('📄 Début du fichier:', textContent.substring(0, 200));
    console.log('📄 Fin du fichier:', textContent.substring(textContent.length - 200));
    
    // Nettoyer le contenu JSON
    let cleanedContent = textContent;
    
    // Remplacer les valeurs NaN par null
    cleanedContent = cleanedContent.replace(/:\s*NaN/g, ': null');
    
    // Remplacer les valeurs undefined par null
    cleanedContent = cleanedContent.replace(/:\s*undefined/g, ': null');
    
    // Remplacer les virgules en trop
    cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');
    
    console.log('🧹 Contenu nettoyé (début):', cleanedContent.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('❌ Erreur de parsing JSON:', parseError);
      console.log('🔍 Contenu problématique autour de l\'erreur:');
      
      // Essayer de trouver la ligne problématique
      const lines = cleanedContent.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('NaN') || line.includes('undefined')) {
          console.log(`Ligne ${index + 1}: ${line}`);
        }
      });
      
      throw new Error(`Erreur de parsing JSON: ${parseError.message}`);
    }
    
    if (!Array.isArray(data)) {
      console.error('❌ Les données ne sont pas un tableau:', typeof data);
      throw new Error('Le fichier JSON doit contenir un tableau d\'objets');
    }
    
    console.log('✅ JSON parsé avec succès:', data.length, 'éléments');
    
    // Analyser la structure des données
    if (data.length > 0) {
      console.log('🔍 Structure du premier élément:');
      const firstItem = data[0];
      Object.keys(firstItem).forEach(key => {
        console.log(`  ${key}:`, typeof firstItem[key], firstItem[key]);
      });
    }
    
    // Transformer les données
    const transformedData: StudentData[] = [];
    let validCount = 0;
    let invalidCount = 0;
    
    data.forEach((person: any, index: number) => {
      try {
        const student = transformPerson(person, index);
        if (student) {
          transformedData.push(student);
          validCount++;
        } else {
          invalidCount++;
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la transformation de l'élément ${index}:`, error);
        invalidCount++;
      }
    });
    
    console.log(`✅ Transformation terminée: ${validCount} valides, ${invalidCount} invalides`);
    
    if (transformedData.length === 0) {
      console.warn('⚠️ Aucune donnée valide trouvée après transformation');
      
      // Afficher quelques exemples pour diagnostic
      console.log('🔍 Exemples de données brutes pour diagnostic:');
      data.slice(0, 3).forEach((item, index) => {
        console.log(`Élément ${index}:`, JSON.stringify(item, null, 2));
      });
    }
    
    return transformedData;
    
  } catch (error) {
    console.error('❌ Erreur lors du chargement des données JSON:', error);
    throw error;
  }
}

function transformPerson(person: any, index: number): StudentData | null {
  if (!person || typeof person !== 'object') {
    console.log(`⚠️ Élément ${index} n'est pas un objet valide:`, person);
    return null;
  }
  
  // Extraire les informations de base (nom et prénom sont maintenant optionnels)
  const nom = person.nom ? String(person.nom).trim() : undefined;
  const prenom = person.prenom ? String(person.prenom).trim() : undefined;
  
  // Utiliser les noms de propriétés avec underscores comme dans vos données
  const adresseDomicile = String(person.adresse_domicile || person.adresseDomicile || '').trim();
  const adresseEtablissement = String(person.adresse_etablissement || person.adresseEtablissement || '').trim();
  const ville = String(person.ville || '').trim();
  const codePostal = String(person.code_postal || person.codePostal || '').trim();
  
  // Créer un identifiant unique pour l'affichage
  let id = '';
  if (nom && prenom) {
    id = `${prenom} ${nom}`;
  } else if (nom) {
    id = nom;
  } else if (prenom) {
    id = prenom;
  } else {
    id = `Étudiant ${index + 1}`;
  }
  
  // Vérifier qu'on a au moins une adresse
  if (!adresseDomicile && !adresseEtablissement && !ville) {
    if (index < 5) {
      console.log(`⚠️ Élément ${index} manque d'informations d'adresse:`, { 
        adresseDomicile, 
        adresseEtablissement, 
        ville 
      });
    }
    return null;
  }
  
  // Extraire les coordonnées avec les VRAIS noms de propriétés de vos données
  const coordsDomicile = extractCoordinates(person, [
    'coordinates_domicile',      // ✅ C'est le nom dans vos données !
    'coordinatesDomicile',       // Fallback camelCase
    'coordinates',               // Fallback générique
    'coordonneesDomicile',
    'coordDomicile',
    'latLngDomicile'
  ]);
  
  const coordsEtablissement = extractCoordinates(person, [
    'coordinates_etablissement', // ✅ C'est le nom dans vos données !
    'coordinatesEtablissement',  // Fallback camelCase
    'coordonneesEtablissement',
    'coordEtablissement',
    'latLngEtablissement'
  ]);
  
  // Vérifier qu'on a au moins une coordonnée
  if (!coordsDomicile && !coordsEtablissement) {
    if (index < 5) {
      console.log(`⚠️ Élément ${index} n'a aucune coordonnée valide:`, {
        id,
        coordsDomicileRaw: person.coordinates_domicile,
        coordsEtablissementRaw: person.coordinates_etablissement,
        allKeys: Object.keys(person)
      });
    }
    return null;
  }
  
  const student: StudentData = {
    nom,
    prenom,
    id,
    adresseDomicile,
    adresseEtablissement,
    ville,
    codePostal,
    coordinatesDomicile: coordsDomicile,
    coordinatesEtablissement: coordsEtablissement
  };
  
  if (index < 3) {
    console.log(`✅ Étudiant ${index + 1} transformé:`, {
      id: student.id,
      hasDomicile: !!student.coordinatesDomicile,
      hasEtablissement: !!student.coordinatesEtablissement,
      coordsDomicile: student.coordinatesDomicile,
      coordsEtablissement: student.coordinatesEtablissement
    });
  }
  
  return student;
}

function extractCoordinates(obj: any, possibleKeys: string[]): [number, number] | undefined {
  for (const key of possibleKeys) {
    if (obj[key]) {
      const coords = validateCoordinates(obj[key]);
      if (coords) {
        console.log(`🎯 Coordonnées trouvées avec la clé "${key}":`, coords);
        return coords;
      }
    }
  }
  return undefined;
}

function validateCoordinates(coords: any): [number, number] | undefined {
  if (!coords) {
    return undefined;
  }
  
  // Si c'est un tableau
  if (Array.isArray(coords) && coords.length >= 2) {
    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);
    return validateLatLng(lat, lng);
  }
  
  // Si c'est un objet avec lat/lng ou latitude/longitude
  if (typeof coords === 'object' && coords !== null) {
    const lat = coords.lat || coords.latitude || coords.y;
    const lng = coords.lng || coords.longitude || coords.lon || coords.x;
    if (lat !== undefined && lng !== undefined) {
      return validateLatLng(parseFloat(lat), parseFloat(lng));
    }
  }
  
  // Si c'est une chaîne de caractères (format "lat,lng")
  if (typeof coords === 'string' && coords.includes(',')) {
    const parts = coords.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 2) {
      return validateLatLng(parts[0], parts[1]);
    }
  }
  
  return undefined;
}

function validateLatLng(lat: number, lng: number): [number, number] | undefined {
  // Vérifier que les coordonnées sont des nombres valides
  if (isNaN(lat) || isNaN(lng) || lat === null || lng === null) {
    return undefined;
  }
  
  // Vérifier les plages valides pour latitude et longitude
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return undefined;
  }
  
  return [lat, lng];
}

// Fonction pour parser les données Excel (conservée pour compatibilité)
export async function parseExcelData(): Promise<StudentData[]> {
  try {
    console.log('📊 Tentative de chargement des fichiers Excel...');
    return [];
  } catch (error) {
    console.error('❌ Erreur lors du parsing des fichiers Excel:', error);
    throw error;
  }
}

// Fonction pour ajouter vos données personnalisées
export function addCustomStudentData(customData: StudentData[]): StudentData[] {
  return customData;
}