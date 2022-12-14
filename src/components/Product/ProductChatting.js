import React from 'react';
import axios from 'axios';
import Header from '../../layout/Header';
import { API_BASE_URL } from '../../Const';
import { TalkBox } from 'react-talk';
import SockJsClient from 'react-stomp';
import {
  CHATTING_SERVER_BASE_URL,
  CHATTING_SERVER_WEB_SOCKET_URL,
} from '../../ChattingConst';
import {
  getDefaultAxiosJsonConfig,
  getDefaultHeaderWithAuthorization,
} from '../../utils/APIUtils';
import { Navigate } from 'react-router-dom';
import { withKeycloak } from '@react-keycloak/web';

class ProductChatting extends React.Component {
  state = {
    isLoading: true,
    clientConnected: false,
    messages: [],
    // productList: [],
    productName: 'Loading...',
  };

  getChattingHistory = async () => {
    const { id } = this.props.match.params;
    const { data: messages } = await axios.get(
      `${CHATTING_SERVER_BASE_URL}/products/${id}/history`,
    );

    // console.log("return: ", products);
    // console.log(products);
    this.setState({ isLoading: false, messages: messages });
  };

  sendMessage = (msg, selfMsg) => {
    const { id } = this.props.match.params;
    const { keycloak } = this.props;

    if (!(keycloak && keycloak.authenticated)) {
      alert('다시 로그인 해주세요.');

      return (
        <Navigate
          to={{
            pathname: '/',
            state: { from: this.props.location },
          }}
        />
      );
    }

    try {
      var send_message = {
        productId: id,
        author: keycloak.subject,
        authorId: keycloak.subject,
        messageType: 'TALK',
        message: selfMsg.message,
      };
      this.clientRef.sendMessage(
        '/pub/chat/message',
        JSON.stringify(send_message),
      );
      return true;
    } catch (e) {
      return false;
    }
  };

  onMessageReceive = (msg, topic) => {
    //alert(JSON.stringify(msg) + " @ " +  JSON.stringify(this.state.messages)+" @ " + JSON.stringify(topic));
    this.setState((prevState) => ({
      messages: [...prevState.messages, msg],
    }));
  };

  getProduct = async () => {
    const { id } = this.props.match.params;

    // TODO: add try catch
    const { data: product } = await axios.get(
      `${API_BASE_URL}/api/v1/products/${id}`,
    );

    this.setState({ productName: product.title });
  };

  componentDidMount() {
    this.getChattingHistory();
    this.getProduct();
  }

  render() {
    // console.log("product List : ", productList);
    const { id } = this.props.match.params;
    var TOPIC_SUB_URL = `/sub/chat/product/${id}`;
    const { keycloak, keycloakInitialized } = this.props;
    console.log('chatting.keycloak', keycloak);

    if (!keycloakInitialized) {
      return <h3>Loading ... !!!</h3>;
    }

    return (
      <div>
        <Header menuName="Product Chatting"></Header>
        <div className="w3-row">
          <section>
            <div>
              <TalkBox
                topic={"'Hi' 문자를 입력 후 enter를 눌러 시작하세요!"}
                currentUserId={keycloak.subject}
                currentUser={keycloak.subject}
                messages={this.state.messages}
                onSendMessage={this.sendMessage}
                connected={this.state.clientConnected}
              />

              <SockJsClient
                url={CHATTING_SERVER_WEB_SOCKET_URL}
                topics={[TOPIC_SUB_URL]}
                onMessage={this.onMessageReceive}
                headers={getDefaultHeaderWithAuthorization()}
                ref={(client) => {
                  this.clientRef = client;
                }}
                onConnect={() => {
                  this.setState({ clientConnected: true });
                }}
                onDisconnect={() => {
                  this.setState({ clientConnected: false });
                }}
                debug={false}
                style={[{ width: '100%', height: '100%' }]}
              />
            </div>
          </section>
        </div>
        <div>{/* <Pager></Pager> */}</div>
      </div>
    );
  }
}

export default withKeycloak(ProductChatting);
