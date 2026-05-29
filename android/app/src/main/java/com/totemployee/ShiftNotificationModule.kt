package com.totemployee

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShiftNotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val CHANNEL_ID = "shift_timer_channel"
    private val NOTIFICATION_ID = 98471
    private val notificationManager: NotificationManager by lazy {
        reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    override fun getName(): String {
        return "ShiftNotification"
    }

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Shift Progress"
            val descriptionText = "Displays ongoing shift timer and can capacity"
            val importance = NotificationManager.IMPORTANCE_LOW // Low importance so it doesn't buzz on every sale update
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun showShiftNotification(
        startTimeMs: Double,
        durationMs: Double,
        boxNumber: String,
        currentCan: String,
        teaCups: Int,
        teasSold: Int,
        totalTeasSold: Int,
        canIndex: Int
    ) {
        val context = reactContext.applicationContext
        val packageName = context.packageName
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // The countdown target is startTime + SHIFT_DURATION
        val endTimeMs = (startTimeMs + durationMs).toLong()

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon) // Use app's launcher icon
            .setContentTitle("Active Shift Countdown")
            .setContentText("Cans: $canIndex/3 | Cups: $teaCups/120 | Sales: $totalTeasSold cups")
            .setSubText("Box: $boxNumber | Can: $currentCan")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        // Premium feature: Native Chronometer ticking countdown
        builder.setUsesChronometer(true)
        builder.setWhen(endTimeMs)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setChronometerCountDown(true)
        }

        // Premium feature: Progress bar of their daily 360 sales target
        // Max progress is 360 cups (3 cans)
        builder.setProgress(360, totalTeasSold, false)

        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }

    @ReactMethod
    fun updateShiftNotification(
        boxNumber: String,
        currentCan: String,
        teaCups: Int,
        teasSold: Int,
        totalTeasSold: Int,
        canIndex: Int,
        startTimeMs: Double,
        durationMs: Double
    ) {
        val context = reactContext.applicationContext
        val packageName = context.packageName
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val endTimeMs = (startTimeMs + durationMs).toLong()

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle("Active Shift Countdown")
            .setContentText("Cans: $canIndex/3 | Cups: $teaCups/120 | Sales: $totalTeasSold cups")
            .setSubText("Box: $boxNumber | Can: $currentCan")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        builder.setUsesChronometer(true)
        builder.setWhen(endTimeMs)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setChronometerCountDown(true)
        }

        // Progress bar: Total Sales progress
        builder.setProgress(360, totalTeasSold, false)

        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }

    @ReactMethod
    fun dismissShiftNotification() {
        notificationManager.cancel(NOTIFICATION_ID)
    }
}
