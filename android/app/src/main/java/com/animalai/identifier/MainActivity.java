package com.animalai.identifier;

import android.os.Build;
import android.os.Bundle;
import android.app.AlertDialog;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check if device is Samsung Galaxy
        // Allow testing on non-Samsung devices but show warning
        if (!isSamsungDevice()) {
            showDeviceWarning();
        }
    }
    
    private boolean isSamsungDevice() {
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        String model = Build.MODEL.toLowerCase();
        
        // Check if it's a Samsung device
        if (manufacturer.contains("samsung")) {
            // Check if it's a Galaxy device
            return model.contains("galaxy") || 
                   model.startsWith("sm-g") || 
                   model.startsWith("sm-n") || 
                   model.startsWith("sm-a") || 
                   model.startsWith("sm-f") ||
                   model.startsWith("sm-s");
        }
        return false;
    }
    
    private void showDeviceWarning() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Device Notice")
               .setMessage("This app is optimized for Samsung Galaxy devices. Some features may not work as expected on other devices.")
               .setPositiveButton("Continue", (dialog, which) -> dialog.dismiss())
               .setNegativeButton("Exit", (dialog, which) -> finish())
               .setCancelable(true)
               .show();
    }
}
