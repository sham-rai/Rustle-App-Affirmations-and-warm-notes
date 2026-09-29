package app.rustle.blockstore

import com.google.android.gms.auth.blockstore.Blockstore
import com.google.android.gms.auth.blockstore.BlockstoreClient
import com.google.android.gms.auth.blockstore.DeleteBytesRequest
import com.google.android.gms.auth.blockstore.RetrieveBytesRequest
import com.google.android.gms.auth.blockstore.StoreBytesData
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Thin bridge over Google Block Store. Values are small strings (a refresh token, well under the
 * 4 KB entry limit). Nothing here is logged: a failure surfaces as a rejected promise only.
 */
class BlockStoreModule : Module() {
  private val client: BlockstoreClient
    get() = Blockstore.getClient(appContext.reactContext ?: throw Exceptions.ReactContextLost())

  override fun definition() = ModuleDefinition {
    Name("RustleBlockStore")

    // Cloud backup (device-to-device restore) is requested only when Block Store confirms it is
    // end-to-end encrypted, i.e. the device has a screen lock. Without it the entry stays on the
    // device, which still survives a reinstall (docs/07 §5). A Google account alone must never be
    // enough to recover someone's session.
    AsyncFunction("store") { key: String, value: String, promise: Promise ->
      val blockstore = client
      blockstore.isEndToEndEncryptionAvailable.addOnCompleteListener { check ->
        val endToEnd = check.isSuccessful && check.result == true
        val data = StoreBytesData.Builder()
          .setKey(key)
          .setBytes(value.toByteArray(Charsets.UTF_8))
          .setShouldBackupToCloud(endToEnd)
          .build()
        blockstore.storeBytes(data)
          .addOnSuccessListener { promise.resolve(endToEnd) }
          .addOnFailureListener { promise.reject("ERR_BLOCK_STORE_WRITE", it.message, it) }
      }
    }

    AsyncFunction("retrieve") { key: String, promise: Promise ->
      val request = RetrieveBytesRequest.Builder().setKeys(listOf(key)).build()
      client.retrieveBytes(request)
        .addOnSuccessListener { response ->
          val bytes = response.blockstoreDataMap[key]?.bytes
          promise.resolve(bytes?.toString(Charsets.UTF_8))
        }
        .addOnFailureListener { promise.reject("ERR_BLOCK_STORE_READ", it.message, it) }
    }

    AsyncFunction("remove") { key: String, promise: Promise ->
      val request = DeleteBytesRequest.Builder().setKeys(listOf(key)).build()
      client.deleteBytes(request)
        .addOnSuccessListener { promise.resolve(it) }
        .addOnFailureListener { promise.reject("ERR_BLOCK_STORE_DELETE", it.message, it) }
    }

    AsyncFunction("isEndToEndEncryptionAvailable") { promise: Promise ->
      client.isEndToEndEncryptionAvailable
        .addOnSuccessListener { promise.resolve(it) }
        .addOnFailureListener { promise.reject("ERR_BLOCK_STORE_E2EE", it.message, it) }
    }
  }
}
