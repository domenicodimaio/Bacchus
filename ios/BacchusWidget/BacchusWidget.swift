import WidgetKit
import SwiftUI

// MARK: - Widget Entry
struct BacchusWidgetEntry: TimelineEntry {
    let date: Date
    let currentBAC: Double
    let targetBAC: Double
    let targetDescription: String
    let timeRemaining: String
    let progressPercentage: Double
    let status: BACStatus
    let userProfile: UserProfile
    let lastUpdated: String
}

// MARK: - Data Models
enum BACStatus: String, CaseIterable {
    case safe = "safe"
    case caution = "caution" 
    case danger = "danger"
    
    var color: Color {
        switch self {
        case .safe: return .green
        case .caution: return .orange
        case .danger: return .red
        }
    }
    
    var icon: String {
        switch self {
        case .safe: return "checkmark.circle.fill"
        case .caution: return "exclamationmark.triangle.fill"
        case .danger: return "xmark.octagon.fill"
        }
    }
}

struct UserProfile {
    let name: String
    let emoji: String
    let color: String
}

// MARK: - Timeline Provider
struct BacchusWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BacchusWidgetEntry {
        BacchusWidgetEntry(
            date: Date(),
            currentBAC: 0.35,
            targetBAC: 0.0,
            targetDescription: "Completamente sobrio",
            timeRemaining: "2h 30m",
            progressPercentage: 65,
            status: .caution,
            userProfile: UserProfile(name: "Demo", emoji: "🍷", color: "#FF5252"),
            lastUpdated: "10:30"
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (BacchusWidgetEntry) -> ()) {
        let entry = placeholder(in: context)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<BacchusWidgetEntry>) -> ()) {
        let currentDate = Date()
        
        // Prova a leggere i dati salvati da React Native
        let bacData = loadBACDataFromUserDefaults()
        
        let entry = BacchusWidgetEntry(
            date: currentDate,
            currentBAC: bacData?.currentBAC ?? 0.0,
            targetBAC: bacData?.targetBAC ?? 0.0,
            targetDescription: bacData?.targetDescription ?? "Monitoraggio BAC",
            timeRemaining: bacData?.timeRemaining ?? "0m",
            progressPercentage: bacData?.progressPercentage ?? 0,
            status: BACStatus(rawValue: bacData?.status ?? "safe") ?? .safe,
            userProfile: bacData?.userProfile ?? UserProfile(name: "User", emoji: "👤", color: "#FF5252"),
            lastUpdated: bacData?.lastUpdated ?? DateFormatter.localizedString(from: currentDate, dateStyle: .none, timeStyle: .short)
        )
        
        // Aggiorna ogni 5 minuti per il decadimento BAC
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
}

// MARK: - Widget Views
struct SmallBacchusWidgetView: View {
    let entry: BacchusWidgetEntry
    
    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    colors: [entry.status.color.opacity(0.3), entry.status.color.opacity(0.1)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            
            VStack(spacing: 4) {
                Text(entry.userProfile.emoji)
                    .font(.system(size: 24))
                
                Text("\(entry.currentBAC, specifier: "%.2f")")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(entry.status.color)
                
                Text("g/L")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct MediumBacchusWidgetView: View {
    let entry: BacchusWidgetEntry
    
    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    colors: [entry.status.color.opacity(0.2), entry.status.color.opacity(0.05)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(entry.userProfile.emoji)
                            .font(.system(size: 20))
                        Text(entry.userProfile.name)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    
                    HStack(alignment: .bottom) {
                        Text("\(entry.currentBAC, specifier: "%.2f")")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(entry.status.color)
                        Text("g/L")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                            .offset(y: -2)
                    }
                    
                    Text("Target: \(entry.targetBAC, specifier: "%.1f") g/L")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
                
                VStack(alignment: .trailing, spacing: 8) {
                    Image(systemName: entry.status.icon)
                        .foregroundColor(entry.status.color)
                        .font(.system(size: 16))
                    
                    Text(entry.timeRemaining)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                    
                    ProgressView(value: entry.progressPercentage, total: 100)
                        .progressViewStyle(LinearProgressViewStyle(tint: entry.status.color))
                        .frame(width: 60)
                }
            }
            .padding()
        }
    }
}

struct LargeBacchusWidgetView: View {
    let entry: BacchusWidgetEntry
    
    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(LinearGradient(
                    colors: [entry.status.color.opacity(0.15), entry.status.color.opacity(0.03)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            
            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    Text(entry.userProfile.emoji)
                        .font(.system(size: 24))
                    Text(entry.userProfile.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                    Spacer()
                    Image(systemName: "app.badge")
                        .foregroundColor(.secondary)
                        .font(.system(size: 14))
                }
                
                // BAC Display
                HStack(alignment: .bottom) {
                    Text("\(entry.currentBAC, specifier: "%.2f")")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(entry.status.color)
                    Text("g/L")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.secondary)
                        .offset(y: -4)
                    Spacer()
                    VStack(alignment: .trailing) {
                        Image(systemName: entry.status.icon)
                            .foregroundColor(entry.status.color)
                            .font(.system(size: 20))
                        Text(getStatusText(for: entry.status, bac: entry.currentBAC))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(entry.status.color)
                    }
                }
                
                // Progress Section
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Target: \(entry.targetDescription)")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)
                        Spacer()
                        Text(entry.timeRemaining)
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(.primary)
                    }
                    
                    ProgressView(value: entry.progressPercentage, total: 100)
                        .progressViewStyle(LinearProgressViewStyle(tint: entry.status.color))
                    
                    HStack {
                        Text("\(Int(entry.progressPercentage))% completato")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("Agg. \(entry.lastUpdated)")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding()
        }
    }
    
    private func getStatusText(for status: BACStatus, bac: Double) -> String {
        switch status {
        case .safe:
            return bac > 0 ? "Sotto limite" : "Sobrio"
        case .caution:
            return "Attenzione"
        case .danger:
            return "Pericolo"
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
                    .containerBackground(for: .widget) {
                        Color.clear
                    }
            } else {
                BacchusWidgetEntryView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Bacchus BAC Monitor")
        .description("Monitora il tuo tasso alcolemico direttamente dalla home screen.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct BacchusWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: BacchusWidgetProvider.Entry
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallBacchusWidgetView(entry: entry)
        case .systemMedium:
            MediumBacchusWidgetView(entry: entry)
        case .systemLarge:
            LargeBacchusWidgetView(entry: entry)
        default:
            SmallBacchusWidgetView(entry: entry)
        }
    }
}

// MARK: - Data Loading
struct BACWidgetData {
    let currentBAC: Double
    let targetBAC: Double
    let targetDescription: String
    let timeRemaining: String
    let progressPercentage: Double
    let status: String
    let userProfile: UserProfile
    let lastUpdated: String
}

func loadBACDataFromUserDefaults() -> BACWidgetData? {
    let userDefaults = UserDefaults(suiteName: "group.com.bacchusapp.app.widget")
    
    guard let data = userDefaults?.data(forKey: "BACWidgetData"),
          let decodedData = try? JSONDecoder().decode(BACWidgetData.self, from: data) else {
        return nil
    }
    
    return decodedData
}

// MARK: - Widget Bundle
@main
struct BacchusWidgetBundle: WidgetBundle {
    var body: some Widget {
        BacchusWidget()
        BacchusLiveActivity()
    }
}
