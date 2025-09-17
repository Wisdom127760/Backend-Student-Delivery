const mongoose = require('mongoose');
const Delivery = require('../src/models/Delivery');
const Driver = require('../src/models/Driver');
const Remittance = require('../src/models/Remittance');

/**
 * Script to clear all deliveries and reset driver statistics
 * This will:
 * 1. Delete all deliveries from the database
 * 2. Clear all remittances
 * 3. Reset driver statistics (totalDeliveries, completedDeliveries, totalEarnings)
 * 4. Reset driver ratings to default
 * 
 * WARNING: This is a destructive operation that cannot be undone!
 */

async function clearAllDeliveries() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-delivery');
        console.log('🍃 Connected to MongoDB');

        // Safety confirmation
        console.log('\n⚠️  WARNING: This will permanently delete ALL deliveries and reset driver statistics!');
        console.log('📊 This operation will:');
        console.log('   • Delete all delivery records');
        console.log('   • Delete all remittance records');
        console.log('   • Reset all driver statistics to zero');
        console.log('   • Reset all driver ratings to 3.0');
        console.log('   • Clear all delivery-related data');

        // Get current counts for confirmation
        const deliveryCount = await Delivery.countDocuments();
        const remittanceCount = await Remittance.countDocuments();
        const driverCount = await Driver.countDocuments();

        console.log(`\n📈 Current database state:`);
        console.log(`   • Deliveries: ${deliveryCount}`);
        console.log(`   • Remittances: ${remittanceCount}`);
        console.log(`   • Drivers: ${driverCount}`);

        // In a real scenario, you might want to add a confirmation prompt here
        // For now, we'll proceed with the cleanup

        console.log('\n🧹 Starting cleanup process...\n');

        // Step 1: Delete all deliveries
        console.log('🗑️  Step 1: Deleting all deliveries...');
        const deliveryResult = await Delivery.deleteMany({});
        console.log(`   ✅ Deleted ${deliveryResult.deletedCount} deliveries`);

        // Step 2: Delete all remittances
        console.log('🗑️  Step 2: Deleting all remittances...');
        const remittanceResult = await Remittance.deleteMany({});
        console.log(`   ✅ Deleted ${remittanceResult.deletedCount} remittances`);

        // Step 3: Reset all driver statistics
        console.log('🔄 Step 3: Resetting driver statistics...');
        const driverUpdateResult = await Driver.updateMany(
            {},
            {
                $set: {
                    totalDeliveries: 0,
                    completedDeliveries: 0,
                    totalEarnings: 0,
                    rating: 3.0,
                    achievedMilestones: [],
                    referralPoints: 0
                }
            }
        );
        console.log(`   ✅ Reset statistics for ${driverUpdateResult.modifiedCount} drivers`);

        // Step 4: Verify cleanup
        console.log('\n🔍 Step 4: Verifying cleanup...');
        const finalDeliveryCount = await Delivery.countDocuments();
        const finalRemittanceCount = await Remittance.countDocuments();

        // Get a sample of drivers to verify stats reset
        const sampleDrivers = await Driver.find({}).limit(3).select('fullName totalDeliveries completedDeliveries totalEarnings rating');

        console.log(`   📊 Final counts:`);
        console.log(`      • Deliveries: ${finalDeliveryCount}`);
        console.log(`      • Remittances: ${finalRemittanceCount}`);

        console.log(`   👥 Sample driver stats (first 3 drivers):`);
        sampleDrivers.forEach((driver, index) => {
            console.log(`      ${index + 1}. ${driver.fullName || driver.name || 'Unknown'}:`);
            console.log(`         - Total Deliveries: ${driver.totalDeliveries}`);
            console.log(`         - Completed Deliveries: ${driver.completedDeliveries}`);
            console.log(`         - Total Earnings: ${driver.totalEarnings}`);
            console.log(`         - Rating: ${driver.rating}`);
        });

        console.log('\n🎉 Cleanup completed successfully!');
        console.log('✨ The system is now ready for a fresh start.');
        console.log('\n📝 Next steps:');
        console.log('   • Drivers can now start accepting new deliveries');
        console.log('   • All statistics will begin from zero');
        console.log('   • New remittances will be calculated from fresh deliveries');

        await mongoose.disconnect();
        console.log('\n🍃 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Additional utility function to clear only specific driver's deliveries
async function clearDriverDeliveries(driverId) {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-delivery');
        console.log('🍃 Connected to MongoDB');

        // Find the driver
        const driver = await Driver.findById(driverId);
        if (!driver) {
            console.error(`❌ Driver with ID ${driverId} not found`);
            process.exit(1);
        }

        console.log(`\n🧹 Clearing deliveries for driver: ${driver.fullName || driver.name || 'Unknown'}`);

        // Delete deliveries for this specific driver
        const deliveryResult = await Delivery.deleteMany({ assignedTo: driverId });
        console.log(`   ✅ Deleted ${deliveryResult.deletedCount} deliveries for this driver`);

        // Delete remittances for this driver
        const remittanceResult = await Remittance.deleteMany({ driverId: driverId });
        console.log(`   ✅ Deleted ${remittanceResult.deletedCount} remittances for this driver`);

        // Reset driver statistics
        await Driver.findByIdAndUpdate(driverId, {
            $set: {
                totalDeliveries: 0,
                completedDeliveries: 0,
                totalEarnings: 0,
                rating: 3.0,
                achievedMilestones: [],
                referralPoints: 0
            }
        });
        console.log(`   ✅ Reset statistics for driver`);

        console.log('\n🎉 Driver cleanup completed successfully!');
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error during driver cleanup:', error.message);
        process.exit(1);
    }
}

// Function to show current statistics before cleanup
async function showCurrentStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-delivery');
        console.log('🍃 Connected to MongoDB');

        const deliveryCount = await Delivery.countDocuments();
        const remittanceCount = await Remittance.countDocuments();
        const driverCount = await Driver.countDocuments();

        // Get delivery status breakdown
        const deliveryStatusBreakdown = await Delivery.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get remittance status breakdown
        const remittanceStatusBreakdown = await Remittance.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get top 5 drivers by deliveries
        const topDrivers = await Driver.find({})
            .sort({ totalDeliveries: -1 })
            .limit(5)
            .select('fullName totalDeliveries completedDeliveries totalEarnings rating');

        console.log('\n📊 Current Database Statistics:');
        console.log(`   • Total Deliveries: ${deliveryCount}`);
        console.log(`   • Total Remittances: ${remittanceCount}`);
        console.log(`   • Total Drivers: ${driverCount}`);

        if (deliveryStatusBreakdown.length > 0) {
            console.log('\n📦 Delivery Status Breakdown:');
            deliveryStatusBreakdown.forEach(status => {
                console.log(`   • ${status._id}: ${status.count}`);
            });
        }

        if (remittanceStatusBreakdown.length > 0) {
            console.log('\n💰 Remittance Status Breakdown:');
            remittanceStatusBreakdown.forEach(status => {
                console.log(`   • ${status._id}: ${status.count}`);
            });
        }

        if (topDrivers.length > 0) {
            console.log('\n🏆 Top 5 Drivers by Deliveries:');
            topDrivers.forEach((driver, index) => {
                console.log(`   ${index + 1}. ${driver.fullName || driver.name || 'Unknown'}:`);
                console.log(`      - Total: ${driver.totalDeliveries}, Completed: ${driver.completedDeliveries}`);
                console.log(`      - Earnings: ${driver.totalEarnings}, Rating: ${driver.rating}`);
            });
        }

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error getting statistics:', error.message);
        process.exit(1);
    }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'stats':
        showCurrentStats();
        break;
    case 'driver':
        const driverId = args[1];
        if (!driverId) {
            console.error('❌ Please provide a driver ID: node clearDeliveries.js driver <driverId>');
            process.exit(1);
        }
        clearDriverDeliveries(driverId);
        break;
    case 'all':
    default:
        clearAllDeliveries();
        break;
}

// Export functions for potential use in other scripts
module.exports = {
    clearAllDeliveries,
    clearDriverDeliveries,
    showCurrentStats
};
