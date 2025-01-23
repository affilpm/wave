# from django.shortcuts import render

# # Create your views here.
# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework.permissions import IsAuthenticated
# from rest_framework import status
# import razorpay
# from django.conf import settings

# class CreateRazorpayOrderView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         client = razorpay.Client(
#             auth=(settings.RAZOR_KEY_ID, settings.RAZOR_KEY_SECRET)
#         )
        
#         plan_name = request.data.get('plan')
#         price_map = {
#             'Individual': 1099,  # $10.99
#             'Duo': 1499,         # $14.99
#             'Family': 1599       # $15.99
#         }
        
#         amount = price_map.get(plan_name, 1099)  # Default to Individual
        
#         ORDER_PARAMS = {
#             'amount': amount * 100,  # Convert to paisa/cents
#             'currency': 'INR',
#             'receipt': f'{request.user.id}_premium_{plan_name}',
#             'notes': {
#                 'user_id': request.user.id,
#                 'plan': plan_name
#             }
#         }
        
#         order = client.order.create(ORDER_PARAMS)
        
#         return Response({
#             'order_id': order['id'],
#             'amount': amount,
#             'key_id': settings.RAZOR_KEY_ID
#         })

# class VerifyPaymentView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         client = razorpay.Client(
#             auth=(settings.RAZOR_KEY_ID, settings.RAZOR_KEY_SECRET)
#         )
        
#         try:
#             client.utility.verify_payment_signature({
#                 'razorpay_payment_id': request.data['payment_id'],
#                 'razorpay_order_id': request.data['order_id'],
#                 'razorpay_signature': request.data['signature']
#             })
            
#             # Create subscription/record payment
#             return Response({'status': 'success'}, status=status.HTTP_200_OK)
        
#         except Exception as e:
#             return Response({'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)