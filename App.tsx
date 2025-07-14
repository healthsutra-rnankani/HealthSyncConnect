import React, { useEffect, useState } from "react";
import { View, Text, Button, Platform, Alert, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AppleHealthKit, {
  HealthUnit,
  HealthInputOptions,
  HealthKitPermissions,
  HealthValue,
} from "react-native-health";

import {
  initialize,
  requestPermission,
  readRecords,
  RecordType,
} from "react-native-health-connect";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

const SERVER_URL = "https://healthsyncconnect.onrender.com/api/healthdata";
const USER_ID_STORAGE_KEY = "@MyApp:userId";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState(true);

  useEffect(() => {
    const loadOrCreateUserId = async () => {
      try {
        let userId = await AsyncStorage.getItem(USER_ID_STORAGE_KEY);

        if (userId === null) {
          userId = uuidv4();
          await AsyncStorage.setItem(USER_ID_STORAGE_KEY, userId);
          console.log("Generated new userId:", userId);
        } else {
          console.log("Loaded existing userId:", userId);
        }
        setCurrentUserId(userId);
      } catch (error) {
        console.error("Error loading or saving userId:", error);
        Alert.alert("Error", "Could not load or create a user ID.");
      } finally {
        setIsLoadingUserId(false);
      }
    };

    loadOrCreateUserId();
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable notifications in settings.");
      }
    };
    requestPermissions();
  }, []);

  const sendHealthData = async () => {
    if (isLoadingUserId) {
      Alert.alert("Please Wait", "Loading user ID...");
      return;
    }

    if (!currentUserId) {
      Alert.alert("Error", "User ID not available. Please restart the app.");
      return;
    }

    if (isSending) {
      console.log("Already sending data, please wait.");
      return;
    }
    Alert.alert(
      "Sending Data",
      "Fetching and sending health data. This might take a moment...",
      [{ text: "OK" }]
    );
    try {
      if (Platform.OS === "ios") {
        await fetchAndSendAppleHealthData(currentUserId);
      } else if (Platform.OS === "android") {
        await fetchAndSendAndroidHealthData(currentUserId);
      } else {
        Alert.alert("Unsupported platform");
      }
    } catch (error) {
      console.error("Health data error:", error);
      Alert.alert("Error", "Failed to send health data.");
    }
  };

  const fetchAndSendAppleHealthData = async (currentUserId: string) => {
    //console.log("1");
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.ActivitySummary,
          AppleHealthKit.Constants.Permissions.AppleExerciseTime,
          AppleHealthKit.Constants.Permissions.AppleStandTime,
          AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
          AppleHealthKit.Constants.Permissions.BiologicalSex,
          AppleHealthKit.Constants.Permissions.BloodType,
          AppleHealthKit.Constants.Permissions.BloodAlcoholContent,
          AppleHealthKit.Constants.Permissions.BloodGlucose,
          AppleHealthKit.Constants.Permissions.BloodPressureDiastolic,
          AppleHealthKit.Constants.Permissions.BloodPressureSystolic,
          AppleHealthKit.Constants.Permissions.BodyFatPercentage,
          AppleHealthKit.Constants.Permissions.BodyMass,
          AppleHealthKit.Constants.Permissions.BodyMassIndex,
          AppleHealthKit.Constants.Permissions.BodyTemperature,
          AppleHealthKit.Constants.Permissions.DateOfBirth,
          AppleHealthKit.Constants.Permissions.Carbohydrates,
          AppleHealthKit.Constants.Permissions.EnergyConsumed,
          AppleHealthKit.Constants.Permissions.EnvironmentalAudioExposure,
          AppleHealthKit.Constants.Permissions.FatTotal,
          AppleHealthKit.Constants.Permissions.Fiber,
          AppleHealthKit.Constants.Permissions.HeadphoneAudioExposure,
          AppleHealthKit.Constants.Permissions.InsulinDelivery,
          AppleHealthKit.Constants.Permissions.OxygenSaturation,
          AppleHealthKit.Constants.Permissions.Protein,
          AppleHealthKit.Constants.Permissions.Water,
          AppleHealthKit.Constants.Permissions.DistanceCycling,
          AppleHealthKit.Constants.Permissions.DistanceSwimming,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.Electrocardiogram,
          AppleHealthKit.Constants.Permissions.FlightsClimbed,
          AppleHealthKit.Constants.Permissions.HeartbeatSeries,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.RestingHeartRate,
          AppleHealthKit.Constants.Permissions.HeartRateVariability,
          AppleHealthKit.Constants.Permissions.Height,
          AppleHealthKit.Constants.Permissions.LeanBodyMass,
          AppleHealthKit.Constants.Permissions.MindfulSession,
          AppleHealthKit.Constants.Permissions.PeakFlow,
          AppleHealthKit.Constants.Permissions.RespiratoryRate,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.Vo2Max,
          AppleHealthKit.Constants.Permissions.WaistCircumference,
          AppleHealthKit.Constants.Permissions.WalkingHeartRateAverage,
          AppleHealthKit.Constants.Permissions.Weight,
          AppleHealthKit.Constants.Permissions.Workout,
          AppleHealthKit.Constants.Permissions.WorkoutRoute,
        ],

        write: [],
      },
    };
    //console.log("2");

    return new Promise<void>((resolve) => {
      //console.log("3");

      AppleHealthKit.initHealthKit(permissions, async (err: string) => {
        //console.log("4");

        if (err) {
          console.log("HealthKit init error:", err);
          return resolve();
        }
        //console.log("5");

        const healthData: any = {};
        const startDateDate = new Date();
        startDateDate.setDate(startDateDate.getDate() - 1);
        startDateDate.setHours(0, 0, 0, 0);
        const endDateDate = new Date();
        endDateDate.setDate(endDateDate.getDate() - 1);
        endDateDate.setHours(23, 59, 59, 999);
        const startDate = new Date(startDateDate).toISOString();
        const endDate = new Date(endDateDate).toISOString();
        const timeZero = new Date(0).toISOString();

        const wrap = (fn: Function, options: object) =>
          new Promise<{ key: string; value: any[] }>((resolve) => {
            const key = fn.name || "unknown";
            // console.log(`Starting ${key}...`);

            const startTime = Date.now();

            fn(options, (error: string, results: any) => {
              const duration = ((Date.now() - startTime) / 1000).toFixed(2);

              if (error || !results) {
                console.warn(`${key} failed after ${duration}s:`, error);
                resolve({ key, value: [] });
              } else {
                //console.log(`Finished ${key} in ${duration}s`);
                resolve({ key, value: results });
              }
            });
          });

        const results = await Promise.all([
          wrap(AppleHealthKit.getBiologicalSex, { startDate, endDate }),
          wrap(AppleHealthKit.getBloodType, { startDate, endDate }),
          wrap(AppleHealthKit.getDateOfBirth, { startDate, endDate }),
          wrap(AppleHealthKit.getLatestWeight, { startDate, endDate }),
          wrap(AppleHealthKit.getWeightSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getLatestHeight, { startDate, endDate }),
          wrap(AppleHealthKit.getHeightSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getLatestWaistCircumference, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getWaistCircumferenceSamples, {
            startDate,
            endDate,
          }),
          // (Crashes App) wrap(AppleHealthKit.getLatestPeakFlow, { startDate, endDate }),
          wrap(AppleHealthKit.getPeakFlowSamples, { startDate, endDate }),
          // (Broken) wrap(AppleHealthKit.getLatestBmi, { startDate, endDate }),
          wrap(AppleHealthKit.getBmiSamples, { startDate, endDate }),
          // (Broken) wrap(AppleHealthKit.getLatestBodyFatPercentage, {
          //   startDate,
          //   endDate,
          // }),
          wrap(AppleHealthKit.getBodyFatPercentageSamples, {
            startDate,
            endDate,
          }),
          // (Broken) wrap(AppleHealthKit.getLatestLeanBodyMass, { startDate, endDate }),
          wrap(AppleHealthKit.getLeanBodyMassSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getStepCount, { startDate, endDate }),
          wrap(AppleHealthKit.getSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getAnchoredWorkouts, { startDate, endDate }),
          wrap(AppleHealthKit.getDailyStepCountSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getDistanceWalkingRunning, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getDailyDistanceWalkingRunningSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getDistanceCycling, { startDate, endDate }),
          wrap(AppleHealthKit.getDailyDistanceCyclingSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getFlightsClimbed, { startDate, endDate }),
          wrap(AppleHealthKit.getDailyFlightsClimbedSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getEnergyConsumedSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getProteinSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getFiberSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getTotalFatSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getWater, { startDate, endDate }),
          wrap(AppleHealthKit.getWaterSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getHeartRateSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getRestingHeartRate, { startDate, endDate }),
          wrap(AppleHealthKit.getWalkingHeartRateAverage, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getActiveEnergyBurned, { startDate, endDate }),
          wrap(AppleHealthKit.getBasalEnergyBurned, { startDate, endDate }),
          wrap(AppleHealthKit.getAppleExerciseTime, { startDate, endDate }),
          wrap(AppleHealthKit.getAppleStandTime, { startDate, endDate }),
          wrap(AppleHealthKit.getVo2MaxSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getBodyTemperatureSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getBloodPressureSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getRespiratoryRateSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getHeartRateVariabilitySamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getHeartbeatSeriesSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getRestingHeartRateSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getBloodGlucoseSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getCarbohydratesSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getSleepSamples, { startDate, endDate }),
          wrap(AppleHealthKit.getInfo, { startDate, endDate }),
          wrap(AppleHealthKit.getMindfulSession, { startDate, endDate }),
          // wrap(AppleHealthKit.getWorkoutRouteSamples, { startDate, endDate }),
          // (Broken) wrap(AppleHealthKit.getLatestBloodAlcoholContent, {
          //   startDate,
          //   endDate,
          // }),
          wrap(AppleHealthKit.getBloodAlcoholContentSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getDistanceSwimming, { startDate, endDate }),
          wrap(AppleHealthKit.getDailyDistanceSwimmingSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getOxygenSaturationSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getElectrocardiogramSamples, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getEnvironmentalAudioExposure, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getHeadphoneAudioExposure, {
            startDate,
            endDate,
          }),
          wrap(AppleHealthKit.getActivitySummary, { startDate, endDate }),
          wrap(AppleHealthKit.getInsulinDeliverySamples, {
            startDate,
            endDate,
          }),
        ]);
        results.forEach(({ key, value }) => {
          healthData[key] = value;
        });

        // console.log("iOS Health Data:", healthData);
        await sendToMongoDB(healthData, "iOS", currentUserId);

        resolve();
      });
    });
  };

  const fetchAndSendAndroidHealthData = async (currentUserId: string) => {
    console.log("Android Data");
    const isInitialized = await initialize();
    console.log("Initialized");

    const grantedPermissions = await requestPermission([
      { accessType: "read", recordType: "ActiveCaloriesBurned" },
      { accessType: "read", recordType: "BasalBodyTemperature" },
      { accessType: "read", recordType: "BasalMetabolicRate" },
      { accessType: "read", recordType: "BloodGlucose" },
      { accessType: "read", recordType: "BloodPressure" },
      { accessType: "read", recordType: "BodyFat" },
      { accessType: "read", recordType: "BodyTemperature" },
      { accessType: "read", recordType: "BodyWaterMass" },
      { accessType: "read", recordType: "BoneMass" },
      { accessType: "read", recordType: "CervicalMucus" },
      { accessType: "read", recordType: "CyclingPedalingCadence" },
      { accessType: "read", recordType: "ElevationGained" },
      { accessType: "read", recordType: "ExerciseSession" },
      { accessType: "read", recordType: "FloorsClimbed" },
      { accessType: "read", recordType: "HeartRate" },
      { accessType: "read", recordType: "RestingHeartRate" },
      { accessType: "read", recordType: "Steps" },
      { accessType: "read", recordType: "StepsCadence" },
      { accessType: "read", recordType: "Distance" },
      { accessType: "read", recordType: "Height" },
      { accessType: "read", recordType: "Hydration" },
      { accessType: "read", recordType: "HeartRateVariabilityRmssd" },
      { accessType: "read", recordType: "SexualActivity" },
      { accessType: "read", recordType: "Weight" },
      { accessType: "read", recordType: "Nutrition" },
      { accessType: "read", recordType: "LeanBodyMass" },
      { accessType: "read", recordType: "IntermenstrualBleeding" },
      { accessType: "read", recordType: "Speed" },
      { accessType: "read", recordType: "MenstruationFlow" },
      { accessType: "read", recordType: "MenstruationPeriod" },
      { accessType: "read", recordType: "SleepSession" },
      { accessType: "read", recordType: "RespiratoryRate" },
      { accessType: "read", recordType: "WheelchairPushes" },
      { accessType: "read", recordType: "Vo2Max" },
      { accessType: "read", recordType: "OvulationTest" },
      { accessType: "read", recordType: "TotalCaloriesBurned" },
      { accessType: "read", recordType: "OxygenSaturation" },
      { accessType: "read", recordType: "Power" },
    ]);

    console.log("Permissions Granted");
    console.log("Fetching and sending Android Health Connect data...");

    const yesterday = new Date();
    yesterday.setDate(new Date().getDate() - 1);

    const startTime = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      0,
      0,
      0,
      0
    ).toISOString();

    const endTime = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59,
      999
    ).toISOString();

    const recordTypes: RecordType[] = [
      "ActiveCaloriesBurned",
      "BasalBodyTemperature",
      "BasalMetabolicRate",
      "BloodGlucose",
      "BloodPressure",
      "BodyFat",
      "BodyTemperature",
      "BodyWaterMass",
      "BoneMass",
      "CervicalMucus",
      "CyclingPedalingCadence",
      "ElevationGained",
      "ExerciseSession",
      "FloorsClimbed",
      "HeartRate",
      "RestingHeartRate",
      "Steps",
      "StepsCadence",
      "Distance",
      "Height",
      "Hydration",
      "HeartRateVariabilityRmssd",
      "SexualActivity",
      "Weight",
      "Nutrition",
      "LeanBodyMass",
      "IntermenstrualBleeding",
      "Speed",
      "MenstruationFlow",
      "MenstruationPeriod",
      "SleepSession",
      "RespiratoryRate",
      "WheelchairPushes",
      "Vo2Max",
      "OvulationTest",
      "TotalCaloriesBurned",
      "OxygenSaturation",
      "Power",
    ];
    const allRecords: Partial<Record<RecordType, any[]>> = {};

    for (const recordType of recordTypes) {
      try {
        const { records } = await readRecords(recordType, {
          timeRangeFilter: {
            operator: "between",
            startTime,
            endTime,
          },
        });
        allRecords[recordType] = records;
      } catch (error) {
        console.warn(`Error reading ${recordType}:`, error);
      }
    }
    //console.log("All Records:", allRecords);
    await sendToMongoDB(allRecords, "Android", currentUserId);
  };

  const scheduleDailyNotification = async (hour: number, minute: number) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const trigger = new Date();
    trigger.setHours(hour);
    trigger.setMinutes(minute);
    trigger.setSeconds(0);

    if (trigger < new Date()) {
      trigger.setDate(trigger.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Daily Health Reminder",
        body: "Don't forget to send your health data today!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: hour,
        minute: minute,
        second: 0,
        repeats: true,
      },
    });

    Alert.alert(
      "Notification scheduled",
      `Daily at ${hour}:${minute.toString().padStart(2, "0")}`
    );
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowPicker(false);
    if (selectedTime) {
      setTime(selectedTime);
      scheduleDailyNotification(
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
    }
  };

  const sendToMongoDB = async (
    healthData: any,
    platform: "iOS" | "Android",
    userId: string
  ) => {
    setIsSending(true);
    console.log(`Attempting to send ${platform} data to MongoDB...`);

    try {
      const dataToSend = {
        platform: platform,
        data: healthData,
        userId: userId,
      };

      console.log("Data structure being sent:", dataToSend);

      const response = await fetch(SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log("Data sent successfully!");
        Alert.alert(
          "Success",
          `${platform.toUpperCase()} health data sent successfully.`
        );
      } else {
        console.error(
          "Server responded with error:",
          response.status,
          responseData
        );
        Alert.alert(
          "Error",
          `Failed to send ${platform.toUpperCase()} data: ${
            responseData.message || response.statusText
          }`
        );
      }
    } catch (error) {
      console.error("Network or fetch error:", error);
      Alert.alert(
        "Error",
        `Could not send ${platform.toUpperCase()} data. Check your network connection and server URL.`
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Sync App</Text>

      <View style={styles.button}>
        {/* Disable button while sending */}
        <Button
          title={isSending ? "Sending..." : "Send Yesterday's Health Data"}
          onPress={sendHealthData}
          disabled={isSending}
        />
      </View>

      <View style={styles.button}>
        <Button
          title="Edit Notification Time"
          onPress={() => setShowPicker(true)}
          disabled={isSending}
        />
      </View>

      {showPicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f0f4f8",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    marginVertical: 10,
  },
});
