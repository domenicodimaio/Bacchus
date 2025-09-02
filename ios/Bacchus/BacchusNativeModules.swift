import Foundation
import WidgetKit
import ActivityKit

// MARK: - Widget Native Module
class BacchusWidgetModule: NSObject {
    
    static func updateWidget(data: [String: Any]) {
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            print("❌ Widget: Cannot access app group")
            return
        }
        
        let widgetData = [
            "currentBAC": data["currentBAC"] as? Double ?? 0.0,
            "sessionActive": data["sessionActive"] as? Bool ?? false,
            "userName": data["userName"] as? String ?? "User",
            "timeToSober": data["timeToSober"] as? String ?? "0min"
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: widgetData)
            userDefaults.set(jsonData, forKey: "BacchusWidgetData")
            
            // Richiedi aggiornamento widget
            WidgetCenter.shared.reloadAllTimelines()
            
            print("✅ Widget data updated successfully")
        } catch {
            print("❌ Widget data encoding error: \(error)")
        }
    }
    
    static func clearWidgets() {
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            return
        }
        
        userDefaults.removeObject(forKey: "BacchusWidgetData")
        WidgetCenter.shared.reloadAllTimelines()
        
        print("🗑️ Widget data cleared")
    }
}
