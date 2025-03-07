import * as React from 'react';

import ExpoAPIIcon from '../components/ExpoAPIIcon';
import ComponentListScreen from './ComponentListScreen';

const screens = [
  'ActivityIndicator',
  'AdMob',
  'BarCodeScanner',
  'BlurView',
  'Button',
  'Camera',
  'Checkbox',
  'DateTimePicker',
  'DrawerLayoutAndroid',
  'FacebookAds',
  'GL',
  'GestureHandlerList',
  'GestureHandlerPinch',
  'GestureHandlerSwipeable',
  'Gif',
  'HTML',
  'Image',
  'LinearGradient',
  'Lottie',
  'Maps',
  'MaskedView',
  'Modal',
  'Picker',
  'Pressable',
  'ProgressBarAndroid',
  'ProgressViewIOS',
  'QRCode',
  'Reanimated',
  'SVG',
  'Screens',
  'ScrollView',
  'SegmentedControl',
  'SharedElement',
  'Slider',
  'Switch',
  'Text',
  'TextInput',
  'TouchableBounce',
  'Touchables',
  'Video',
  'PagerView',
  'WebView',
];

export const ScreenItems = screens.map((name) => ({
  name,
  route: `/components/${name.toLowerCase()}`,
  // isAvailable: !!Screens[name],
  isAvailable: true,
}));

export default function ExpoComponentsScreen() {
  const renderItemRight = React.useCallback(
    ({ name }: { name: string }) => (
      <ExpoAPIIcon name={name} style={{ marginRight: 10, marginLeft: 6 }} />
    ),
    []
  );

  return <ComponentListScreen renderItemRight={renderItemRight} apis={ScreenItems} />;
}
