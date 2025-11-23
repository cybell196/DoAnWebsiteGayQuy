/**
 * Script để tự động setup/update database
 * Chạy: node backend/scripts/setup-db.js
 * 
 * Lưu ý: Script này chỉ dùng cho development.
 * Production nên chạy SQL files thủ công để kiểm soát tốt hơn.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fundraise_app',
  multipleStatements: true
};

async function runSQLFile(filePath) {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📄 Đang chạy: ${path.basename(filePath)}`);
    await connection.query(sql);
    await connection.end();
    
    console.log(`✅ Hoàn thành: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Lỗi khi chạy ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

async function checkDatabase() {
  try {
    const connection = await mysql.createConnection({
      ...DB_CONFIG,
      database: undefined // Không chọn database để kiểm tra
    });
    
    // Kiểm tra database có tồn tại không
    const [databases] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [DB_CONFIG.database]
    );
    
    await connection.end();
    return databases.length > 0;
  } catch (error) {
    console.error('❌ Lỗi kết nối database:', error.message);
    return false;
  }
}

async function checkTableExists(tableName) {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [DB_CONFIG.database, tableName]
    );
    await connection.end();
    return tables.length > 0;
  } catch (error) {
    return false;
  }
}

async function checkColumnEnum(tableName, columnName, expectedValues) {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    const [columns] = await connection.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [DB_CONFIG.database, tableName, columnName]
    );
    await connection.end();
    
    if (columns.length === 0) return false;
    
    const columnType = columns[0].COLUMN_TYPE;
    const hasAllValues = expectedValues.every(val => 
      columnType.includes(`'${val}'`)
    );
    
    return hasAllValues;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 Bắt đầu setup database...\n');
  
  // Kiểm tra kết nối
  const dbExists = await checkDatabase();
  if (!dbExists) {
    console.log('⚠️  Database chưa tồn tại. Vui lòng tạo database trước.');
    console.log(`   Tạo database: CREATE DATABASE ${DB_CONFIG.database};`);
    return;
  }
  
  const campaignsExists = await checkTableExists('campaigns');
  const notificationsExists = await checkTableExists('notifications');
  
  // Kiểm tra campaigns status
  if (campaignsExists) {
    const hasEndedStatus = await checkColumnEnum('campaigns', 'status', ['PENDING', 'APPROVED', 'REJECTED', 'ENDED']);
    if (!hasEndedStatus) {
      console.log('📝 Cần cập nhật status của campaigns...');
      const rootPath = path.join(__dirname, '../../');
      await runSQLFile(path.join(rootPath, 'db_update_add_ended_status.sql'));
    } else {
      console.log('✅ Campaigns status đã được cập nhật');
    }
  }
  
  // Kiểm tra notifications type
  if (notificationsExists) {
    const hasCorrectTypes = await checkColumnEnum('notifications', 'type', ['CAMPAIGN_APPROVED', 'CAMPAIGN_REJECTED', 'NEW_CAMPAIGN']);
    if (!hasCorrectTypes) {
      console.log('📝 Cần cập nhật type của notifications...');
      const rootPath = path.join(__dirname, '../../');
      await runSQLFile(path.join(rootPath, 'db_update_notifications.sql'));
    } else {
      console.log('✅ Notifications type đã được cập nhật');
    }
  }
  
  // Nếu chưa có bảng nào, chạy db.sql
  if (!campaignsExists && !notificationsExists) {
    console.log('📝 Database trống, đang tạo toàn bộ bảng...');
    const rootPath = path.join(__dirname, '../../');
    await runSQLFile(path.join(rootPath, 'db.sql'));
  }
  
  console.log('\n✅ Hoàn tất setup database!');
}

main().catch(console.error);

