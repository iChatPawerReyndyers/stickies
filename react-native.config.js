module.exports = {
  project: {
    ios: {},
    android: {},
  },
  // Tells `npx react-native-asset` where to find custom fonts so it can
  // copy them into android/app/src/main/assets/fonts and wire them into
  // the iOS Xcode project automatically.
  assets: ['./assets/fonts/'],
};
