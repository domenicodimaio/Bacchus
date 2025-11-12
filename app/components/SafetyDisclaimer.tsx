import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

interface SafetyDisclaimerProps {
  variant?: 'compact' | 'full' | 'banner';
  showIcon?: boolean;
  addHorizontalMargin?: boolean;
}

export default function SafetyDisclaimer({ 
  variant = 'compact', 
  showIcon = true,
  addHorizontalMargin = false
}: SafetyDisclaimerProps) {
  const { currentTheme } = useTheme();
  const { t, i18n } = useTranslation(['common', 'safety']);
  const colors = currentTheme.COLORS;
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  const isItalian = i18n.language === 'it';

  const disclaimerText = {
    compact: isItalian 
      ? "⚠️ Solo per scopi educativi - Non sostituisce test medici"
      : "⚠️ Educational purposes only - Not a medical device",
    
    banner: isItalian
      ? "Questo strumento è solo educativo e non sostituisce dispositivi medici professionali"
      : "This tool is educational only and does not replace professional medical devices",
    
    full: isItalian ? {
      title: "⚠️ Importante Disclaimer di Sicurezza",
      points: [
        "🚫 Questo NON è un dispositivo medico certificato",
        "📚 I calcoli sono solo a scopo educativo e informativo", 
        "🏥 Non sostituisce test professionali o dispositivi medici",
        "🚗 Non guidare mai basandoti solo su questi calcoli",
        "⚖️ Non ha valore legale in caso di controlli",
        "👨‍⚕️ Consulta sempre un medico per questioni di salute",
        "🧮 I calcoli possono variare significativamente tra individui",
        "⏰ Il metabolismo dell'alcol dipende da molti fattori personali"
      ],
      footer: "Usa sempre il buon senso e rispetta le leggi locali. La tua sicurezza e quella degli altri è la priorità assoluta."
    } : {
      title: "⚠️ Important Safety Disclaimer", 
      points: [
        "🚫 This is NOT a certified medical device",
        "📚 Calculations are for educational purposes only",
        "🏥 Does not replace professional tests or medical devices", 
        "🚗 Never drive based solely on these calculations",
        "⚖️ Has no legal value in case of controls",
        "👨‍⚕️ Always consult a doctor for health matters",
        "🧮 Calculations can vary significantly between individuals",
        "⏰ Alcohol metabolism depends on many personal factors"
      ],
      footer: "Always use common sense and respect local laws. Your safety and that of others is the absolute priority."
    }
  };

  const renderCompact = () => (
    <TouchableOpacity 
      style={[styles.compactContainer, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}
      onPress={() => {
        console.log('🔧 COMPACT DISCLAIMER: Banner clicked! Opening modal...');
        setShowFullDisclaimer(true);
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.compactText, { color: colors.warning }]}>
        {disclaimerText.compact}
      </Text>
      <Ionicons name="information-circle" size={20} color={colors.warning} />
    </TouchableOpacity>
  );

  const renderBanner = () => (
    <LinearGradient
      colors={[colors.warning + '15', colors.warning + '25']}
      style={[
        styles.bannerContainer, 
        { borderColor: colors.warning + '40' },
        addHorizontalMargin && { marginHorizontal: 16 }
      ]}
    >
      <View style={styles.bannerContent}>
        {showIcon && <Ionicons name="shield-checkmark" size={18} color={colors.warning} />}
        <Text style={[styles.bannerText, { color: colors.warning }]}>
          {disclaimerText.banner}
        </Text>
        <TouchableOpacity 
          onPress={() => setShowFullDisclaimer(true)}
          style={styles.infoButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.6}
        >
          <Ionicons name="information-circle" size={20} color={colors.warning} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderFull = () => (
    <View style={[styles.fullContainer, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}>
      <Text style={[styles.fullTitle, { color: colors.warning }]}>
        {disclaimerText.full.title}
      </Text>
      {disclaimerText.full.points.map((point, index) => (
        <Text key={index} style={[styles.fullPoint, { color: colors.text }]}>
          {point}
        </Text>
      ))}
      <Text style={[styles.fullFooter, { color: colors.textSecondary }]}>
        {disclaimerText.full.footer}
      </Text>
    </View>
  );

  const renderModal = () => (
    <Modal
      visible={showFullDisclaimer}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFullDisclaimer(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {disclaimerText.full.title}
          </Text>
          <TouchableOpacity 
            onPress={() => setShowFullDisclaimer(false)}
            style={[styles.closeButton, { backgroundColor: colors.card }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[colors.warning + '10', colors.warning + '20']}
            style={[styles.modalDisclaimer, { borderColor: colors.warning + '30' }]}
          >
            {disclaimerText.full.points.map((point, index) => (
              <View key={index} style={styles.pointContainer}>
                <Text style={[styles.modalPoint, { color: colors.text }]}>
                  {point}
                </Text>
              </View>
            ))}
            
            <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
              <Text style={[styles.modalFooter, { color: colors.textSecondary }]}>
                {disclaimerText.full.footer}
              </Text>
            </View>
          </LinearGradient>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <>
      {variant === 'compact' && renderCompact()}
      {variant === 'banner' && renderBanner()}
      {variant === 'full' && renderFull()}
      {renderModal()}
    </>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginVertical: 6,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
    lineHeight: 14,
  },
  
  bannerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    marginHorizontal: 8,
    lineHeight: 14,
  },
  infoButton: {
    padding: 4,
    borderRadius: 10,
  },
  
  fullContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  fullTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  fullPoint: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  fullFooter: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalDisclaimer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginVertical: 16,
  },
  pointContainer: {
    marginBottom: 12,
  },
  modalPoint: {
    fontSize: 15,
    lineHeight: 22,
  },
  footerContainer: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  modalFooter: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
});
