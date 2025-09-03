const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Device-ID'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get or create device ID tracking (simple in-memory for now)
const deviceUsage = new Map();

function getDeviceUsage(deviceId) {
    if (!deviceId) return { count: 0, tier: 'free' };
    
    const today = new Date().toDateString();
    const key = `${deviceId}_${today}`;
    
    if (!deviceUsage.has(key)) {
        deviceUsage.set(key, { count: 0, tier: 'free' });
    }
    
    return deviceUsage.get(key);
}

function incrementUsage(deviceId) {
    if (!deviceId) return;
    
    const today = new Date().toDateString();
    const key = `${deviceId}_${today}`;
    const usage = getDeviceUsage(deviceId);
    usage.count++;
    deviceUsage.set(key, usage);
}

// Parse AI response into structured data
function parseAnimalResponse(content) {
    try {
        // Initialize default values
        let result = {
            commonName: 'Unknown Animal',
            scientificName: '',
            size: 'Varies',
            habitat: 'Unknown',
            diet: 'Unknown',
            funFact: '',
            category: 'Animal'
        };

        // Clean up the content - remove markdown formatting
        const cleanContent = content
            .replace(/\*\*/g, '') // Remove bold markdown
            .replace(/\*/g, '')   // Remove italic markdown
            .replace(/#{1,6}\s/g, ''); // Remove heading markers

        // Split into lines for parsing
        const lines = cleanContent.split('\n').filter(line => line.trim());

        // Parse each line
        lines.forEach(line => {
            const lowerLine = line.toLowerCase();
            
            // Common Name
            if (lowerLine.includes('common name:') || lowerLine.includes('name:')) {
                result.commonName = line.split(':').slice(1).join(':').trim();
            }
            // Scientific Name
            else if (lowerLine.includes('scientific name:') || lowerLine.includes('latin name:')) {
                result.scientificName = line.split(':').slice(1).join(':').trim();
            }
            // Size
            else if (lowerLine.includes('size:') || lowerLine.includes('length:') || lowerLine.includes('height:')) {
                result.size = line.split(':').slice(1).join(':').trim();
            }
            // Habitat
            else if (lowerLine.includes('habitat:') || lowerLine.includes('found in:') || lowerLine.includes('location:')) {
                result.habitat = line.split(':').slice(1).join(':').trim();
            }
            // Diet
            else if (lowerLine.includes('diet:') || lowerLine.includes('eats:') || lowerLine.includes('food:')) {
                result.diet = line.split(':').slice(1).join(':').trim();
            }
            // Fun Fact
            else if (lowerLine.includes('fact:') || lowerLine.includes('interesting:') || lowerLine.includes('trivia:')) {
                result.funFact = line.split(':').slice(1).join(':').trim();
            }
            // Category
            else if (lowerLine.includes('category:') || lowerLine.includes('type:') || lowerLine.includes('class:')) {
                result.category = line.split(':').slice(1).join(':').trim();
            }
        });

        // If we couldn't parse structured data, try to extract from unstructured text
        if (result.commonName === 'Unknown Animal' && lines.length > 0) {
            // First line often contains the name
            result.commonName = lines[0].replace(/[^\w\s]/g, '').trim();
        }

        // Check if common name looks like a scientific name (two lowercase Latin words)
        // If so, try to extract the real common name from the fun fact or other fields
        if (result.commonName && /^[a-z]+ [a-z]+$/i.test(result.commonName.trim())) {
            // This looks like a scientific name, not a common name
            // Try to find the real common name in the fun fact
            if (result.funFact) {
                // Look for capitalized animal names in the fun fact
                const matches = result.funFact.match(/\b([A-Z][a-z]+ )?[A-Z][a-z]+ [A-Z][a-z]+\b/g) ||
                               result.funFact.match(/\b[A-Z][a-z]+ [a-z]+\b/g);
                if (matches && matches.length > 0) {
                    // Use the scientific name as scientific name if not already set
                    if (!result.scientificName) {
                        result.scientificName = result.commonName;
                    }
                    // Use the found name as common name
                    result.commonName = matches[0];
                }
            }
        }

        // If no fun fact was found, use the last substantial line
        if (!result.funFact && lines.length > 1) {
            const potentialFact = lines[lines.length - 1];
            if (potentialFact.length > 20) {
                result.funFact = potentialFact;
            }
        }

        return result;
    } catch (error) {
        console.error('Error parsing animal response:', error);
        return {
            commonName: 'Unknown Animal',
            scientificName: '',
            size: 'Unknown',
            habitat: 'Unknown',
            diet: 'Unknown',
            funFact: content,
            category: 'Animal'
        };
    }
}

// Main animal identification endpoint
app.post('/api/identify', async (req, res) => {
    const startTime = Date.now();
    const deviceId = req.headers['x-device-id'];
    
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ 
                success: false,
                error: 'No image provided' 
            });
        }

        console.log('Received request, image length:', image.length);
        
        // Check daily limit for free tier (5 per day)
        const usage = getDeviceUsage(deviceId);
        if (usage.count >= 3) {
            console.log(`Device ${deviceId} hit daily limit`);
            return res.status(402).json({
                success: false,
                error: 'Daily limit reached',
                message: 'You\'ve used all 3 free identifications today. Try again tomorrow or upgrade to Premium!',
                creditsRemaining: 0
            });
        }
        
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
            console.error('OpenAI API key not configured');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error',
                message: 'AI service not configured. Please contact support.'
            });
        }
        
        console.log('Calling OpenAI API...');
        
        // Improved prompt for better structured output
        const systemPrompt = `You are an animal identification expert. When identifying animals from images, provide information in this EXACT format without any markdown formatting or asterisks:

Common Name: [the specific breed or species name - e.g., Labradoodle, Great Dane, Golden Retriever, Maine Coon, Beagle, Persian Cat]
Scientific Name: [scientific/latin name in proper format, e.g., Canis lupus familiaris]
Category: [Mammal/Bird/Reptile/Amphibian/Fish/Insect/etc]
Size: [typical size range with units, be specific e.g., 24-26 inches tall]
Habitat: [where this animal typically lives, be specific about regions/environments]  
Diet: [what this animal typically eats, be specific about food types]
Fun Fact: [one interesting and specific fact about this specific breed or species]

CRITICAL RULES for Common Name:
- For dogs: Use specific breed names like "Labradoodle", "Great Dane", "Golden Retriever", "Beagle" - NEVER just "Dog"
- For cats: Use specific breed names like "Maine Coon", "Persian Cat", "Siamese" - NEVER just "Cat"
- For wild animals: Use specific species like "African Lion", "American Bison", "Bald Eagle"
- ALWAYS be as specific as possible with breed/species identification
- NEVER use scientific names as the common name
- NEVER say just "Dog" or "Cat" - always identify the specific breed`;

        // Call OpenAI API
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",  // Using the more affordable model that supports vision
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Identify this animal and provide the information in the exact format specified."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${image}`,
                                    detail: "low"  // Use "low" to reduce token costs
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300,
                temperature: 0.3  // Lower temperature for more consistent formatting
            })
        });
        
        console.log('OpenAI response status:', openAIResponse.status);
        
        // Parse response
        const responseText = await openAIResponse.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse OpenAI response:', responseText.substring(0, 500));
            return res.status(500).json({
                success: false,
                error: 'Invalid response from AI service',
                message: 'The AI service returned an invalid response. Please try again.'
            });
        }
        
        // Check for API errors
        if (data.error) {
            console.error('OpenAI API error:', data.error);
            
            // Handle common errors
            if (data.error.code === 'invalid_api_key') {
                return res.status(500).json({
                    success: false,
                    error: 'Configuration error',
                    message: 'Server API key is invalid. Please contact support.'
                });
            }
            
            if (data.error.code === 'model_not_found') {
                console.log('Model not found, trying gpt-3.5-turbo as fallback');
                return res.status(500).json({
                    success: false,
                    error: 'AI model not available',
                    message: 'The AI model is not available. Please try again later.'
                });
            }
            
            if (data.error.code === 'rate_limit_exceeded') {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    message: 'Too many requests. Please wait a moment and try again.'
                });
            }
            
            return res.status(500).json({
                success: false,
                error: 'AI service error',
                message: data.error.message || 'Failed to process image'
            });
        }
        
        // Check for valid response structure
        if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            console.error('Invalid OpenAI response structure:', JSON.stringify(data, null, 2));
            return res.status(500).json({
                success: false,
                error: 'Invalid AI response',
                message: 'The AI service returned an unexpected response. Please try again.'
            });
        }
        
        // Extract the animal identification
        const content = data.choices[0].message?.content;
        
        if (!content) {
            console.error('No content in OpenAI response');
            return res.status(500).json({
                success: false,
                error: 'No content in response',
                message: 'The AI could not identify the animal. Please try with a clearer image.'
            });
        }
        
        console.log('OpenAI response received successfully');
        console.log('Raw content:', content);
        
        // Parse the response into structured data
        const parsedResult = parseAnimalResponse(content);
        console.log('Parsed result:', parsedResult);
        
        // Increment usage for free tier
        incrementUsage(deviceId);
        const updatedUsage = getDeviceUsage(deviceId);
        
        // Calculate response time
        const responseTime = Date.now() - startTime;
        console.log(`Request processed in ${responseTime}ms`);
        
        // Send success response with structured data
        res.json({
            success: true,
            result: content,  // Keep raw result for backward compatibility
            structured: parsedResult,  // Add structured data
            creditsRemaining: 3 - updatedUsage.count,
            tier: 'free',
            processingTime: responseTime,
            usage: data.usage  // Include token usage for monitoring
        });
        
    } catch (error) {
        console.error('Server error:', error);
        const responseTime = Date.now() - startTime;
        
        // Check if it's a network error
        if (error.message?.includes('fetch')) {
            return res.status(503).json({
                success: false,
                error: 'Service unavailable',
                message: 'Cannot reach AI service. Please check your internet connection and try again.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'An unexpected error occurred. Please try again.',
            processingTime: responseTime
        });
    }
});

// Get user status endpoint
app.get('/api/user/status', (req, res) => {
    const deviceId = req.headers['x-device-id'];
    
    if (!deviceId) {
        return res.json({
            tier: 'free',
            credits: 3,
            used: 0,
            message: 'Using anonymous free tier'
        });
    }
    
    const usage = getDeviceUsage(deviceId);
    
    res.json({
        tier: 'free',
        credits: 3,
        used: usage.count,
        remaining: Math.max(0, 3 - usage.count),
        resetTime: 'Daily at midnight',
        message: usage.count >= 3 ? 'Daily limit reached' : `${3 - usage.count} identifications remaining today`
    });
});

// Admin endpoint to reset credits (protected by admin key)
app.post('/api/admin/reset-credits', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ 
            success: false,
            error: 'Unauthorized' 
        });
    }
    
    // Clear all usage for testing
    deviceUsage.clear();
    console.log('All device usage reset');
    
    res.json({ 
        success: true, 
        message: 'All usage data reset successfully' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('OpenAI API Key configured:', !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here');
    
    // Log a warning if API key is not set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
        console.warn('⚠️  WARNING: OpenAI API key is not configured properly!');
        console.warn('⚠️  Please set OPENAI_API_KEY in your .env file');
    }
});
