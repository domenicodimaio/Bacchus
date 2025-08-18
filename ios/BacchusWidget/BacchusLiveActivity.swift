import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes
struct BacchusActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        let currentBAC: Double
        let targetBAC: Double
        let targetDescription: String
        let timeRemaining: String
        let progressPercentage: Double
        let isAboveLegalLimit: Bool
        let userProfile: ActivityUserProfile
        let lastUpdated: String
        let timestamp: Double
    }
    
    // Static data that doesn't change during the activity
    let activityId: String
    let startTime: Date
}

struct ActivityUserProfile: Codable, Hashable {
    let name: String
    let emoji: String
    let color: String
}

// MARK: - Live Activity Widget
struct BacchusLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BacchusActivityAttributes.self) { context in
            // Lock screen view
            LockScreenLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Text(context.state.userProfile.emoji)
                            .font(.title2)
                        VStack(alignment: .leading) {
                            Text("BAC")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            Text("\(context.state.currentBAC, specifier: "%.2f")")
                                .font(.title3.bold())
                                .foregroundColor(getBACColor(context.state.currentBAC))
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing) {
                        Text("Target")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(context.state.timeRemaining)
                            .font(.title3.bold())
                            .foregroundColor(.primary)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        HStack {
                            Text(context.state.targetDescription)
                                .font(.footnote)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(Int(context.state.progressPercentage))%")
                                .font(.footnote.bold())
                                .foregroundColor(.primary)
                        }
                        
                        ProgressView(value: context.state.progressPercentage, total: 100)
                            .progressViewStyle(LinearProgressViewStyle(tint: getBACColor(context.state.currentBAC)))
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                // Compact leading view (left side of the pill)
                HStack(spacing: 4) {
                    Text(context.state.userProfile.emoji)
                        .font(.caption)
                    Text("\(context.state.currentBAC, specifier: "%.2f")")
                        .font(.caption.bold())
                        .foregroundColor(getBACColor(context.state.currentBAC))
                }
            } compactTrailing: {
                // Compact trailing view (right side of the pill)
                Text(context.state.timeRemaining)
                    .font(.caption.bold())
                    .foregroundColor(.primary)
            } minimal: {
                // Minimal view (when multiple activities are active)
                Text(context.state.userProfile.emoji)
                    .font(.caption)
            }
        }
        .configurationDisplayName("Bacchus BAC Monitor")
        .description("Monitora il tuo BAC in tempo reale nella Dynamic Island.")
    }
}

// MARK: - Lock Screen View
struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<BacchusActivityAttributes>
    
    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                Text(context.state.userProfile.emoji)
                    .font(.title2)
                Text("Bacchus - Monitoraggio BAC")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Image(systemName: getBACStatusIcon(context.state.currentBAC))
                    .foregroundColor(getBACColor(context.state.currentBAC))
                    .font(.title2)
            }
            
            // Main content
            HStack(spacing: 20) {
                // BAC Display
                VStack(alignment: .leading, spacing: 4) {
                    Text("BAC Attuale")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    HStack(alignment: .bottom) {
                        Text("\(context.state.currentBAC, specifier: "%.2f")")
                            .font(.title.bold())
                            .foregroundColor(getBACColor(context.state.currentBAC))
                        Text("g/L")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                            .offset(y: -2)
                    }
                }
                
                Spacer()
                
                // Target & Time
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Tempo rimanente")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(context.state.timeRemaining)
                        .font(.title2.bold())
                        .foregroundColor(.primary)
                    
                    Text(context.state.targetDescription)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.trailing)
                }
            }
            
            // Progress bar
            VStack(spacing: 4) {
                HStack {
                    Text("Progresso verso target")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(context.state.progressPercentage))%")
                        .font(.caption.bold())
                        .foregroundColor(.primary)
                }
                
                ProgressView(value: context.state.progressPercentage, total: 100)
                    .progressViewStyle(LinearProgressViewStyle(tint: getBACColor(context.state.currentBAC)))
            }
            
            // Footer
            HStack {
                Text(context.state.userProfile.name)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text("Aggiornato: \(formatTime(context.state.lastUpdated))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.regularMaterial)
        )
    }
}

// MARK: - Helper Functions
func getBACColor(_ bac: Double) -> Color {
    if bac < 0.5 {
        return .green
    } else if bac < 0.8 {
        return .orange
    } else {
        return .red
    }
}

func getBACStatusIcon(_ bac: Double) -> String {
    if bac < 0.5 {
        return "checkmark.circle.fill"
    } else if bac < 0.8 {
        return "exclamationmark.triangle.fill"
    } else {
        return "xmark.octagon.fill"
    }
}

func formatTime(_ isoString: String) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
    
    guard let date = formatter.date(from: isoString) else {
        return "N/A"
    }
    
    let timeFormatter = DateFormatter()
    timeFormatter.timeStyle = .short
    return timeFormatter.string(from: date)
}

// MARK: - Preview
#if DEBUG
struct BacchusLiveActivity_Previews: PreviewProvider {
    static let attributes = BacchusActivityAttributes(
        activityId: "preview",
        startTime: Date()
    )
    
    static let contentState = BacchusActivityAttributes.ContentState(
        currentBAC: 0.65,
        targetBAC: 0.5,
        targetDescription: "Soglia legale (0.5 g/L)",
        timeRemaining: "1h 45m",
        progressPercentage: 75,
        isAboveLegalLimit: true,
        userProfile: ActivityUserProfile(name: "Demo User", emoji: "🍷", color: "#FF5252"),
        lastUpdated: "2024-01-20T15:30:00.000Z",
        timestamp: Date().timeIntervalSince1970
    )
    
    static var previews: some View {
        attributes
            .previewContext(contentState, viewKind: .dynamicIsland(.compact))
            .previewDisplayName("Compact")
        
        attributes
            .previewContext(contentState, viewKind: .dynamicIsland(.expanded))
            .previewDisplayName("Expanded")
        
        attributes
            .previewContext(contentState, viewKind: .content)
            .previewDisplayName("Lock Screen")
    }
}
#endif
