Pod::Spec.new do |s|
  s.name = 'WtsSdkReactNative'
  s.version = '0.5.0-alpha.1'
  s.summary = 'Official wts.is React Native SDK.'
  s.homepage = 'https://wts.is'
  s.license = { :type => 'Apache-2.0' }
  s.author = { 'Wetus' => 'info@wetus.co' }
  s.source = { :git => 'https://github.com/wetuscorp/wtsissdk-react-native.git', :tag => s.version.to_s }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.private_header_files = 'ios/WtsSdk.h'
  s.module_name = 'WtsSdkReactNative'
  s.static_framework = true
  s.platform = :ios, '15.0'
  s.dependency 'React-Core'
  s.dependency 'WtsSDK', '0.5.0-alpha.1'
  s.swift_version = '5.9'
  install_modules_dependencies(s)
end
