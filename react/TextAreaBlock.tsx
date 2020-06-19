/* eslint-disable no-console */
import React, { useState, useContext } from 'react'
import {
  FormattedMessage,
  defineMessages,
  WrappedComponentProps,
  injectIntl,
} from 'react-intl'
import { Button, Textarea, ToastContext } from 'vtex.styleguide'
import { OrderForm } from 'vtex.order-manager'
import { addToCart as ADD_TO_CART } from 'vtex.checkout-resources/Mutations'
import { useCssHandles } from 'vtex.css-handles'
import { useMutation } from 'react-apollo'
import { usePWA } from 'vtex.store-resources/PWAContext'
import { usePixel } from 'vtex.pixel-manager/PixelContext'

import ReviewBlock from './components/ReviewBlock'
import { ParseText, GetText } from './utils'

const messages = defineMessages({
  success: {
    id: 'store/toaster.cart.success',
    defaultMessage: '',
    label: '',
  },
  duplicate: {
    id: 'store/toaster.cart.duplicated',
    defaultMessage: '',
    label: '',
  },
  error: { id: 'store/toaster.cart.error', defaultMessage: '', label: '' },
  seeCart: {
    id: 'store/toaster.cart.seeCart',
    defaultMessage: '',
    label: '',
  },
})

const TextAreaBlock: StorefrontFunctionComponent<TextAreaBlockInterface &
  WrappedComponentProps> = ({ intl, value, text, description }: any) => {
  console.log('TextAreaBlock Initiated', text, description)

  const [state, setState] = useState<any>({
    reviewState: false,
    showAddToCart: false,
    textAreaValue: value || '',
    reviewItems: [],
    refidLoading: null,
  })
  const [
    addToCart,
    { error: mutationError, loading: mutationLoading },
  ] = useMutation<{ addToCart: OrderForm }, { items: [] }>(ADD_TO_CART)

  const { push } = usePixel()
  const { settings = {}, showInstallPrompt = undefined } = usePWA() || {}
  const { promptOnCustomEvent } = settings

  const { setOrderForm }: OrderFormContext = OrderForm.useOrderForm()
  const { showToast } = useContext(ToastContext)

  const translateMessage = (message: MessageDescriptor) => {
    return intl.formatMessage(message)
  }

  const resolveToastMessage = (success: boolean, isNewItem: boolean) => {
    if (!success) return translateMessage(messages.error)
    if (!isNewItem) return translateMessage(messages.duplicate)

    return translateMessage(messages.success)
  }
  const toastMessage = ({
    success,
    isNewItem,
  }: {
    success: boolean
    isNewItem: boolean
  }) => {
    const message = resolveToastMessage(success, isNewItem)

    const action = success
      ? {
          label: translateMessage(messages.seeCart),
          href: '/checkout/#/cart',
        }
      : undefined
    console.log('showToast', { message, action })
    showToast({ message, action })
  }

  const callAddToCart = async (items: any) => {
    const mutationResult = await addToCart({
      variables: {
        items: items.map((item: any) => {
          return {
            ...item,
          }
        }),
      },
    })

    if (mutationError) {
      console.error(mutationError)
      toastMessage({ success: false, isNewItem: false })
      return
    }

    // Update OrderForm from the context
    mutationResult.data && setOrderForm(mutationResult.data.addToCart)

    const adjustSkuItemForPixelEvent = (item: any) => {
      return {
        skuId: item.id,
        quantity: item.quantity,
      }
    }
    // Send event to pixel-manager
    const pixelEventItems = items.map(adjustSkuItemForPixelEvent)
    push({
      event: 'addToCart',
      items: pixelEventItems,
    })

    if (
      mutationResult.data?.addToCart?.messages?.generalMessages &&
      mutationResult.data.addToCart.messages.generalMessages.length
    ) {
      mutationResult.data.addToCart.messages.generalMessages.map((msg: any) => {
        return showToast({
          message: msg.text,
          action: undefined,
          duration: 30000,
        })
      })
    } else {
      toastMessage({ success: true, isNewItem: true })
    }

    if (promptOnCustomEvent === 'addToCart' && showInstallPrompt) {
      showInstallPrompt()
    }

    return showInstallPrompt
  }

  const {
    textAreaValue,
    reviewItems,
    reviewState,
    showAddToCart,
    refidLoading,
  } = state

  const onReviewItems = (items: any) => {
    if (items) {
      const show =
        items.filter((item: any) => {
          return !item.vtexSku
        }).length === 0

      setState({
        ...state,
        reviewItems: items,
        reviewState: true,
        showAddToCart: show,
        textAreaValue: GetText(items),
      })
    }
    return true
  }

  const parseText = () => {
    const items: any = ParseText(textAreaValue) || []
    const error = !!items.filter((item: any) => {
      return item.error !== null
    }).length

    setState({
      ...state,
      reviewItems: items,
      reviewState: true,
      hasError: error,
      toValidate: true,
    })
    onReviewItems(items)
  }

  const setTextareaValue = ($textAreaValue: string) => {
    setState({
      ...state,
      textAreaValue: $textAreaValue,
    })
  }

  const CSS_HANDLES = ['buttonValidate'] as const
  const handles = useCssHandles(CSS_HANDLES)

  const addToCartCopyNPaste = () => {
    const items: any = reviewItems.map(({ vtexSku, quantity, seller }: any) => {
      return {
        id: parseInt(vtexSku, 10),
        quantity: parseFloat(quantity),
        seller,
      }
    })
    callAddToCart(items)
  }
  const onRefidLoading = (data: any) => {
    console.log('onRefidLoading', data)
  }
  const backList = () => {
    setState({
      ...state,
      reviewState: false,
    })
  }
  return (
    <div>
      <div className="w-third-l w-100-ns fl-l">
        <div className="flex-grow-1">
          <h2 className="t-heading-3 mb3 ml5 ml3-ns mt4">{text}</h2>
          <div className="t-body lh-copy c-muted-1 mb7 ml3 false">
            {description}
          </div>
        </div>
      </div>
      <div className="w-two-thirds-l w-100-ns fr-l">
        <div className="w-100 mb5">
          <div className="bg-base t-body c-on-base pa7 br3 b--muted-4 ba">
            <Textarea
              value={textAreaValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setTextareaValue(e.target.value)
              }
            />
            <div className={`mt2 flex justify-end ${handles.buttonValidate}`}>
              <Button
                variation="secondary"
                size="regular"
                onClick={() => {
                  parseText()
                }}
              >
                <FormattedMessage id="store/quickorder.validate" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {reviewState && (
        <div className={`pa6 ${handles.reviewBlock}`}>
          <ReviewBlock
            reviewedItems={reviewItems}
            onReviewItems={onReviewItems}
            onRefidLoading={onRefidLoading}
          />
          <div
            className={`mb4 mt4 flex justify-between ${handles.buttonsBlock}`}
          >
            <Button
              variation="tertiary"
              size="small"
              onClick={() => {
                backList()
              }}
            >
              <FormattedMessage id="store/quickorder.back" />
            </Button>
            {showAddToCart && (
              <Button
                variation="primary"
                size="small"
                isLoading={mutationLoading || refidLoading}
                onClick={() => {
                  addToCartCopyNPaste()
                }}
              >
                <FormattedMessage id="store/quickorder.addToCart" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface MessageDescriptor {
  id: string
  description?: string | object
  defaultMessage?: string
}

interface OrderFormContext {
  loading: boolean
  orderForm: OrderForm | undefined
  setOrderForm: (orderForm: Partial<OrderForm>) => void
}

interface TextAreaBlockInterface {
  value: string
  onRefidLoading: any
  text: string
  description: string
}

export default injectIntl(TextAreaBlock)
