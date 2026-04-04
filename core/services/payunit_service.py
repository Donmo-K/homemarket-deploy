import requests
import base64
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class PayUnitService:

    @staticmethod
    def get_auth_headers():
        api_key = getattr(settings, "PAYUNIT_API_KEY", "")
        username = getattr(settings, "PAYUNIT_USERNAME", "") or api_key
        password = getattr(settings, "PAYUNIT_PASSWORD", "")
        mode = getattr(settings, "PAYUNIT_MODE", "sandbox")

        auth_string = f"{username}:{password}"
        base_encoded = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")

        headers = {
            "x-api-key": api_key,
            "Authorization": f"Basic {base_encoded}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "mode": mode,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        }
        return headers

    @staticmethod
    def initialize_payment(amount, transaction_id, return_url, notify_url, description="Property Transaction"):
        endpoint = f"{settings.PAYUNIT_BASE_URL}/api/gateway/initialize"
        
        payload = {
            "total_amount": int(amount),
            "currency": "XAF",
            "transaction_id": transaction_id,
            "return_url": return_url,
            "notify_url": notify_url,
            "description": description,
            "payment_country": "CM"
        }

        headers = PayUnitService.get_auth_headers()
        api_key = getattr(settings, "PAYUNIT_API_KEY", "")
        api_key_masked = api_key[:10]
        logger.info(f"PayUnit initialize payload for {transaction_id}: {payload}")
        logger.info(f"PayUnit headers (masked): x-api-key={api_key_masked}..., mode={headers.get('mode')}")

        try:
            response = requests.post(
                endpoint,
                json=payload,
                headers=headers,
                timeout=(10, 30)
            )
            content_type = response.headers.get("Content-Type", "")
            cf_id = response.headers.get("X-Amz-Cf-Id", "N/A")
            cf_cache = response.headers.get("X-Cache", "N/A")
            
            logger.info(f"PayUnit response for {transaction_id}: status={response.status_code}, content-type={content_type}")
            logger.info(f"CloudFront Debug: X-Cache={cf_cache}, X-Amz-Cf-Id={cf_id}")
            logger.info(f"PayUnit response body: {response.text[:500]}")
            
            if "application/json" in content_type.lower():
                try:
                    data = response.json()
                    if response.status_code == 200:
                        return data
                    else:
                        error_msg = data.get("message", f"PayUnit API error (Code {response.status_code})")
                        return {"status": "FAILED", "message": error_msg}
                except ValueError:
                    pass
            
            if response.status_code == 200:
                try:
                    return response.json()
                except ValueError:
                    return {"status": "FAILED", "message": "Réponse PayUnit invalide (non-JSON)."}
            elif response.status_code == 403:
                return {
                    "status": "FAILED",
                    "message": "Accès refusé par PayUnit (403). Vérifiez vos clés API et le mode (test/live)."
                }
            else:
                return {
                    "status": "FAILED",
                    "message": f"Erreur PayUnit (Code {response.status_code})"
                }
        except requests.exceptions.RequestException as e:
            logger.error(f"Connection error to PayUnit for {transaction_id}: {str(e)}")
            return {
                "status": "FAILED",
                "message": "Impossible de contacter le service de paiement."
            }
@staticmethod
def verify_payment(transaction_id):
    # Essai avec l'endpoint correct PayUnit
    verify_url = f"{settings.PAYUNIT_BASE_URL}/api/gateway/transaction"
    
    try:
        response = requests.get(
            verify_url,
            headers=PayUnitService.get_auth_headers(),
            params={"transaction_id": transaction_id},
            timeout=20
        )
        logger.info(f"PayUnit verify response for {transaction_id}: status={response.status_code}, body={response.text[:300]}")
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        logger.error(f"Error verifying payment {transaction_id}: {str(e)}")
        return None