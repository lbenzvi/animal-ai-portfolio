# Animal AI - Mobile Application

AI-powered animal identification app built with web technologies and deployed as a native Android application.

## Demo Video
**[Click here to view the one-minute demo](./one-minute-demo.mp4)**

## Features
- **Real-time Animal Identification**: Machine learning algorithms process camera captures or gallery images to identify species
- **Comprehensive Species Recognition**: AI system trained on extensive wildlife datasets with detailed species information including habitat, behavior, and conservation status
- **Progressive Web App Architecture**: Offline-capable design works without internet connection once loaded, ensuring reliable performance in remote locations  
- **Cross-platform Native Integration**: Built with Capacitor framework for native mobile capabilities while maintaining web technology flexibility and iOS deployment readiness

## Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Mobile Framework**: Capacitor 5.0
- **Platform**: Android (iOS ready)
- **Build System**: Gradle, Android Studio
- **Deployment**: Google Play Console

## Live Status
Currently in closed alpha testing on Google Play Store with active user testing and feedback integration.

## Architecture
The app uses a hybrid architecture combining web technologies with native mobile capabilities:
- Core logic in JavaScript for cross-platform compatibility
- Native camera and file system access through Capacitor plugins
- Responsive design that adapts to various screen sizes

## Code Highlights

### Camera Integration with Capacitor
```javascript
async function capturePhoto() {
    const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'dataUrl',
        source: CameraSource.Camera
    });
    displayImage(image.dataUrl);
}
```

### AI API Integration with Error Handling  
```javascript
async function identifyAnimal() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/identify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                image: currentImage,
                timestamp: Date.now()
            })
        });
        const result = await response.json();
        displayResults(result);
    } catch (error) {
        showError('Identification failed. Please try again.');
    }
}
```

### Responsive Mobile-First Design
```css
.upload-container {
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
}
```

## Technical Challenges & Solutions

### Cross-Platform Camera Access
**Challenge**: Implementing camera functionality that works seamlessly across web browsers and native mobile platforms with different permission models.

**Solution**: Leveraged Capacitor's unified API layer to abstract platform differences. Implemented fallback mechanisms that gracefully degrade from native camera access to web-based file input on unsupported platforms.

### Image Processing & Optimization  
**Challenge**: Processing high-resolution camera images for AI analysis while maintaining app performance on resource-constrained mobile devices.

**Solution**: Implemented client-side image compression and resizing before API transmission. Used Canvas API for efficient image manipulation, reducing payload size by 70% while maintaining identification accuracy.

### Offline-First Architecture
**Challenge**: Ensuring core functionality remains available without internet connectivity, essential for wildlife identification in remote locations.

**Solution**: Designed Progressive Web App architecture with service worker caching strategies. Implemented local storage for user preferences and basic species information, enabling offline operation of previously loaded data.

### WebView Performance Optimization
**Challenge**: Achieving native-like performance within Android WebView environment, particularly for smooth animations and responsive UI interactions.

**Solution**: Utilized CSS hardware acceleration, optimized DOM manipulations, and implemented efficient event delegation patterns. Applied backdrop-filter effects judiciously to maintain 60fps performance.

## Security Note
This repository is a portfolio version with sensitive configurations and API keys removed for security. The live application is currently deployed on Google Play Store in closed alpha testing. For technical discussions or demo access, please contact me at liambenzvi3@gmail.com or linkedin.com/in/liam-ben-zvi.

---
*Developed by Liam Ben-Zvi*
