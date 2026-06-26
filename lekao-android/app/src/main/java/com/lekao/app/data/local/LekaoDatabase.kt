package com.lekao.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [MistakeDraftEntity::class],
    version = 1,
    exportSchema = false
)
abstract class LekaoDatabase : RoomDatabase() {
    abstract fun mistakeDraftDao(): MistakeDraftDao

    companion object {
        @Volatile
        private var instance: LekaoDatabase? = null

        fun getInstance(context: Context): LekaoDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    LekaoDatabase::class.java,
                    "lekao.db"
                ).build().also { instance = it }
            }
        }
    }
}