#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>

// -------- WIFI --------
#define WIFI_SSID     "********"
#define WIFI_PASSWORD "********"

// -------- FIREBASE --------
#define FIREBASE_HOST "*****************firebasedatabase.app"
#define FIREBASE_AUTH "**************************************"

// -------- PINS --------
#define TSOP_PIN      D6
#define LED_PIN       D7
#define GUN_PIN       D5   // Transistor bases
#define TRIGGER_PIN   D1

// -------- GAME CONFIG --------
#define HIT_COOLDOWN_MS 2000
#define IR_FREQ        38000   // 38 kHz

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool isInvincible = false;
unsigned long hitTime = 0;

void setup() {
  Serial.begin(115200);

  pinMode(TSOP_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(GUN_PIN, OUTPUT);
  pinMode(TRIGGER_PIN, INPUT_PULLUP);

  digitalWrite(LED_PIN, HIGH);   // LED ON by default
  digitalWrite(GUN_PIN, LOW);    // Gun OFF

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("System ready.");
}

void loop() {
  unsigned long now = millis();

  // ---------- HIT COOLDOWN ----------
  if (isInvincible && (now - hitTime >= HIT_COOLDOWN_MS)) {
    isInvincible = false;
    digitalWrite(LED_PIN, HIGH);  // LED back ON
    Serial.println("Cooldown ended.");
  }

  // ---------- HIT DETECTION ----------
  if (!isInvincible && digitalRead(TSOP_PIN) == LOW) {
    registerHit();
  }

  // ---------- GUN FIRING ----------
  if (digitalRead(TRIGGER_PIN) == LOW) {
    tone(GUN_PIN, IR_FREQ);   // Fire IR + laser
  } else {
    noTone(GUN_PIN);          // Stop firing
  }
}

void registerHit() {
  isInvincible = true;
  hitTime = millis();

  digitalWrite(LED_PIN, LOW); // LED OFF when hit
  Serial.println("HIT DETECTED!");

  String eventPath = "/events/" + String(hitTime);

  FirebaseJson json;
  json.set("player", "p2");   // Change per vest
  json.set("event", "shot");
  json.set("timestamp", hitTime);

  if (Firebase.setJSON(fbdo, eventPath, json)) {
    Serial.println("Hit sent to Firebase");
  } else {
    Serial.println("Firebase error:");
    Serial.println(fbdo.errorReason());
  }
}
