import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from '../components/AppHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const colors = currentTheme.COLORS;
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  // 🔥 FIX: Configura swipe back come nelle Impostazioni
  useEffect(() => {
    // Supporta lo swipe back su iOS
    if (Platform.OS === 'ios' && navigation) {
      navigation.setOptions({
        gestureEnabled: true,
        gestureDirection: 'horizontal'
      });
    }
  }, [navigation]);

  const faqData: FAQItem[] = [
    {
      question: "Come funziona il calcolo del tasso alcolemico?",
      answer: "Bacchus utilizza la formula di Widmark per calcolare il tasso alcolemico nel sangue (BAC). Il calcolo tiene conto del peso corporeo, del sesso, della quantità di alcol consumato e del tempo trascorso. Tuttavia, questo è solo un calcolo indicativo e può variare in base a molti fattori individuali come il metabolismo, la salute, i farmaci assunti e il cibo consumato."
    },
    {
      question: "Posso fidarmi completamente del calcolo per guidare?",
      answer: "NO, assolutamente no. Bacchus è solo uno strumento di supporto per avere un'idea approssimativa del tasso alcolemico. NON deve essere utilizzato come unico riferimento per decidere se guidare o meno. Il calcolo può variare significativamente in base a fattori individuali. La responsabilità della guida è sempre e solo tua."
    },
    {
      question: "Quali fattori influenzano il tasso alcolemico?",
      answer: "Molti fattori possono influenzare il BAC: peso corporeo, altezza, sesso, età, percentuale di grasso corporeo, velocità di consumo, tipo di bevanda, cibo nello stomaco, farmaci, stato di salute, livello di idratazione, stress e affaticamento. Per questo il calcolo è sempre indicativo."
    },
    {
      question: "Come posso aggiungere bevande personalizzate?",
      answer: "Nella sezione 'Aggiungi Bevanda' puoi selezionare 'Personalizzata' e inserire manualmente la gradazione alcolica e la quantità. Questo ti permette di tracciare qualsiasi tipo di bevanda alcolica non presente nella lista predefinita."
    },
    {
      question: "Cosa succede ai miei dati se cambio dispositivo?",
      answer: "Se hai un account registrato, i tuoi dati (profili e cronologia sessioni) sono salvati nel cloud e saranno disponibili su qualsiasi dispositivo dopo il login. Se usi l'app come ospite, i dati sono salvati solo localmente e non saranno trasferiti."
    },
    {
      question: "Come posso eliminare una sessione dalla cronologia?",
      answer: "Nella cronologia delle sessioni, scorri verso sinistra sulla sessione che vuoi eliminare e tocca il pulsante 'Elimina'. Puoi anche aprire i dettagli della sessione e utilizzare l'opzione di eliminazione dal menu."
    },
    {
      question: "Cosa significa 'Tempo per tornare a 0.0 g/l'?",
      answer: "È il tempo stimato necessario perché il tuo corpo metabolizzi completamente tutto l'alcol consumato, riportando il BAC a zero. Questo calcolo assume un tasso di metabolismo standard di 0.15 g/l per ora, ma può variare significativamente tra individui."
    },
    {
      question: "Posso usare l'app offline?",
      answer: "Sì, puoi utilizzare tutte le funzioni principali dell'app anche senza connessione internet. I dati saranno sincronizzati automaticamente quando tornerai online. Tuttavia, alcune funzioni come il backup nel cloud richiedono una connessione."
    },
    {
      question: "Come posso contattare il supporto?",
      answer: "Puoi contattarci tramite email all'indirizzo supporto@bacchusapp.com. Includi sempre la versione dell'app e una descrizione dettagliata del problema per ricevere assistenza più rapida."
    },
    {
      question: "L'app è gratuita?",
      answer: "Bacchus offre funzioni base gratuite per tutti gli utenti. La versione Premium include funzionalità avanzate come statistiche dettagliate, backup illimitato e personalizzazioni aggiuntive. Puoi provare Premium gratuitamente per un periodo limitato."
    }
  ];

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader 
          title={t('faq', { ns: 'common', defaultValue: 'FAQ' })}
          isMainScreen={false}
          onBackPress={() => router.back()}
        />
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.headerText, { color: colors.text }]}>
            Domande Frequenti
          </Text>
          <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
            Trova risposte alle domande più comuni su Bacchus
          </Text>

          {faqData.map((item, index) => (
            <View key={index} style={[styles.faqItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.questionContainer}
                onPress={() => toggleExpanded(index)}
              >
                <Text style={[styles.questionText, { color: colors.text }]}>
                  {item.question}
                </Text>
                <Ionicons 
                  name={expandedItems.includes(index) ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
              
              {expandedItems.includes(index) && (
                <View style={styles.answerContainer}>
                  <Text style={[styles.answerText, { color: colors.textSecondary }]}>
                    {item.answer}
                  </Text>
                </View>
              )}
            </View>
          ))}

          <View style={[styles.contactSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.contactTitle, { color: colors.text }]}>
              Non hai trovato quello che cercavi?
            </Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              Contattaci per ricevere assistenza personalizzata
            </Text>
            <TouchableOpacity 
              style={[styles.contactButton, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Ionicons name="mail-outline" size={20} color="white" />
              <Text style={styles.contactButtonText}>
                Contatta il Supporto
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  faqItem: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactSection: {
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
