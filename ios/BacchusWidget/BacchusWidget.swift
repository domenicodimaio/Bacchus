import WidgetKit
import SwiftUI

// MARK: - Data Models
struct BacchusWidgetEntry: TimelineEntry {
    let date: Date
    let currentBAC: Double
    let sessionActive: Bool
    let userName: String
    let timeToSober: String
}

struct BacchusWidgetData: Codable {
    let currentBAC: Double
    let sessionActive: Bool
    let userName: String
    let timeToSober: String
}

// MARK: - Timeline Provider
struct BacchusWidgetProvider: TimelineProvider {
    typealias Entry = BacchusWidgetEntry

    func placeholder(in context: Context) -> BacchusWidgetEntry {
        BacchusWidgetEntry(
            date: Date(),
            currentBAC: 0.15,
            sessionActive: true,
            userName: "Domenico",
            timeToSober: "2h 30min"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (BacchusWidgetEntry) -> ()) {
        let entry = BacchusWidgetEntry(
            date: Date(),
            currentBAC: 0.12,
            sessionActive: true,
            userName: "Domenico",
            timeToSober: "1h 45min"
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BacchusWidgetEntry>) -> ()) {
        let currentDate = Date()

        // Caricare i dati reali dal UserDefaults/App Groups
        let data = loadWidgetData()

        let entry = BacchusWidgetEntry(
            date: currentDate,
            currentBAC: data.currentBAC,
            sessionActive: data.sessionActive,
            userName: data.userName,
            timeToSober: data.timeToSober
        )

        // Aggiornamento ogni 5 minuti per la decay del BAC
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

        completion(timeline)
    }

    private func loadWidgetData() -> BacchusWidgetData {
        print("🔍 Widget: Loading data from app group...")
        
        guard let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget") else {
            print("❌ Widget: Cannot access app group")
            return BacchusWidgetData(
                currentBAC: 0.00,
                sessionActive: false,
                userName: "User",
                timeToSober: "0min"
            )
        }
        
        guard let data = userDefaults.data(forKey: "BacchusWidgetData") else {
            print("⚠️ Widget: No data found in UserDefaults")
            return BacchusWidgetData(
                currentBAC: 0.00,
                sessionActive: false,
                userName: "User",
                timeToSober: "0min"
            )
        }
        
        do {
            let widgetData = try JSONDecoder().decode(BacchusWidgetData.self, from: data)
            print("✅ Widget: Data loaded - BAC: \(widgetData.currentBAC), Active: \(widgetData.sessionActive), User: \(widgetData.userName)")
            return widgetData
        } catch {
            print("❌ Widget: JSON decode error: \(error)")
            return BacchusWidgetData(
                currentBAC: 0.00,
                sessionActive: false,
                userName: "User",
                timeToSober: "0min"
            )
        }
    }
}

// MARK: - Widget Views
struct BacchusWidgetEntryView: View {
    var entry: BacchusWidgetProvider.Entry

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.4, green: 0.2, blue: 0.6), // Purple
                    Color(red: 0.2, green: 0.1, blue: 0.4)  // Dark purple
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 4) {
                // Header
                HStack {
                    Image(systemName: "wineglass.fill")
                        .foregroundColor(.white)
                        .font(.caption)
                    Text("Bacchus")
                        .foregroundColor(.white)
                        .font(.caption)
                        .fontWeight(.semibold)
                    Spacer()
                }

                Spacer()

                // BAC Value
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("BAC")
                            .foregroundColor(.white.opacity(0.8))
                            .font(.caption2)
                        Text(String(format: "%.2f", entry.currentBAC))
                            .foregroundColor(.white)
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("g/L")
                            .foregroundColor(.white.opacity(0.8))
                            .font(.caption2)
                    }

                    Spacer()

                    // Status indicator
                    VStack(alignment: .trailing, spacing: 2) {
                        Circle()
                            .fill(entry.sessionActive ? Color.green : Color.gray)
                            .frame(width: 8, height: 8)
                        if entry.sessionActive && !entry.timeToSober.isEmpty {
                            Text(entry.timeToSober)
                                .foregroundColor(.white.opacity(0.9))
                                .font(.caption2)
                        }
                    }
                }

                Spacer()

                // User name
                HStack {
                    Text(entry.userName)
                        .foregroundColor(.white.opacity(0.8))
                        .font(.caption2)
                    Spacer()
                    Text(entry.date, style: .time)
                        .foregroundColor(.white.opacity(0.6))
                        .font(.caption2)
                }
            }
            .padding(12)
        }
        .containerBackground(for: .widget) {
            // Fallback background per iOS versions che non supportano ZStack background
            Color.clear
        }
    }
}

// MARK: - Widget Configuration
struct BacchusWidget: Widget {
    let kind: String = "BacchusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BacchusWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                BacchusWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                BacchusWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Bacchus BAC")
        .description("Monitora il tuo livello di alcol nel sangue.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    BacchusWidget()
} timeline: {
    BacchusWidgetEntry(date: .now, currentBAC: 0.15, sessionActive: true, userName: "Domenico", timeToSober: "2h 30min")
    BacchusWidgetEntry(date: .now, currentBAC: 0.08, sessionActive: true, userName: "Domenico", timeToSober: "1h 15min")
}