import WidgetKit
import SwiftUI
import ActivityKit // Added for Live Activities

@main
struct BacchusWidgetBundle: WidgetBundle {
    var body: some Widget {
        BacchusWidget()
        if #available(iOS 16.1, *) {
            BacchusLiveActivity()
        }
    }
}

// MARK: - Live Activity Widget (iOS 16.1+)
// RIMOSSO: Duplicazione di BacchusLiveActivity (già definita in BacchusWidgetLiveActivity.swift)