//
//  BacchusNativeModules.swift
//  Bacchus
//
//  Created by Bacchus App on 2025.
//

import Foundation
import React
import ActivityKit
import WidgetKit

@objc(BacchusNativeModules)
class BacchusNativeModules: NSObject, RCTBridgeModule {
  
  static func moduleName() -> String! {
    return "BacchusNativeModules"
  }
  
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // MARK: - Widget Methods
  
  @objc func updateWidget(_ bacData: [String: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🟢 [BacchusNativeModules] updateWidget chiamato con dati: \(bacData)")
    
    // Salva i dati nel UserDefaults standard (temporaneamente senza App Groups)
    let userDefaults = UserDefaults.standard
      do {
        let jsonData = try JSONSerialization.data(withJSONObject: bacData)
        userDefaults.set(jsonData, forKey: "BACData")
        print("🟢 [BacchusNativeModules] Dati salvati in UserDefaults per widget")
        
        // Ricarica i widget
        WidgetCenter.shared.reloadAllTimelines()
        print("🟢 [BacchusNativeModules] Widget ricaricati")
        
        resolver(["success": true])
      } catch {
        print("🔴 [BacchusNativeModules] Errore serializzazione JSON: \(error)")
        rejecter("SERIALIZATION_ERROR", "Errore nella serializzazione dei dati", error)
      }
  }
  
  @objc func clearWidget(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🟢 [BacchusNativeModules] clearWidget chiamato")
    
    let userDefaults = UserDefaults.standard
    userDefaults.removeObject(forKey: "BACData")
    print("🟢 [BacchusNativeModules] Dati widget rimossi da UserDefaults")
    
    // Ricarica i widget
    WidgetCenter.shared.reloadAllTimelines()
    print("🟢 [BacchusNativeModules] Widget ricaricati dopo pulizia")
    
    resolver(["success": true])
  }
  
  // MARK: - Live Activity Methods
  
  @objc func startLiveActivity(_ bacData: [String: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🟢 [BacchusNativeModules] startLiveActivity chiamato con dati: \(bacData)")
    
    if #available(iOS 16.1, *) {
      // Implementazione Live Activity per iOS 16.1+
      // Per ora, salviamo solo i dati
      let userDefaults = UserDefaults.standard
        do {
          let jsonData = try JSONSerialization.data(withJSONObject: bacData)
          userDefaults.set(jsonData, forKey: "LiveActivityData")
          print("🟢 [BacchusNativeModules] Dati Live Activity salvati")
          resolver(["success": true, "activityId": "placeholder"])
        } catch {
          print("🔴 [BacchusNativeModules] Errore serializzazione Live Activity: \(error)")
          rejecter("SERIALIZATION_ERROR", "Errore nella serializzazione dei dati Live Activity", error)
        }
    } else {
      print("🔴 [BacchusNativeModules] Live Activities non supportate su questa versione iOS")
      rejecter("UNSUPPORTED_VERSION", "Live Activities richiedono iOS 16.1+", nil)
    }
  }
  
  @objc func updateLiveActivity(_ bacData: [String: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🟢 [BacchusNativeModules] updateLiveActivity chiamato con dati: \(bacData)")
    
    if #available(iOS 16.1, *) {
      // Aggiorna i dati per Live Activity
      let userDefaults = UserDefaults.standard
        do {
          let jsonData = try JSONSerialization.data(withJSONObject: bacData)
          userDefaults.set(jsonData, forKey: "LiveActivityData")
          print("🟢 [BacchusNativeModules] Dati Live Activity aggiornati")
          resolver(["success": true])
        } catch {
          print("🔴 [BacchusNativeModules] Errore aggiornamento Live Activity: \(error)")
          rejecter("SERIALIZATION_ERROR", "Errore nell'aggiornamento Live Activity", error)
        }
    } else {
      print("🔴 [BacchusNativeModules] Live Activities non supportate per update")
      rejecter("UNSUPPORTED_VERSION", "Live Activities richiedono iOS 16.1+", nil)
    }
  }
  
  @objc func endLiveActivity(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🟢 [BacchusNativeModules] endLiveActivity chiamato")
    
    if #available(iOS 16.1, *) {
      // Termina Live Activity
      let userDefaults = UserDefaults.standard
      userDefaults.removeObject(forKey: "LiveActivityData")
      print("🟢 [BacchusNativeModules] Live Activity terminata")
      resolver(["success": true])
    } else {
      print("🔴 [BacchusNativeModules] Live Activities non supportate per end")
      rejecter("UNSUPPORTED_VERSION", "Live Activities richiedono iOS 16.1+", nil)
    }
  }
}
