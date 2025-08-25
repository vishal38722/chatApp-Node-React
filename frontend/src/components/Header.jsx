import React from 'react'
import { FaUser } from 'react-icons/fa'
import { Button, Modal } from 'react-bootstrap';
import { HiChevronLeft } from 'react-icons/hi'

const Header = ({selectedUser, onUserClick, isUserOnline}) => {
    const [show, setShow] = React.useState(false);

    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

  return (
    <div className="position-sticky d-flex border-bottom px-sm-4 px-6 py-4 px-lg-6 justify-content-between align-items-center border-success bg-success rounded-3 " style={{ margin: "0 -.66rem"}} >
        <div className="d-flex gap-3 align-items-center">
            <div className="position-relative">
                <span className='d-inline d-md-none' style={{cursor: 'pointer'}} onClick={() => onUserClick(null)}>
                    <HiChevronLeft size={35} />
                </span>
                <span className="position-relative">
                    <FaUser size={35} />
                    {/* Online indicator */}
                    {isUserOnline && (
                        <span 
                            className="position-absolute bg-success border border-white rounded-circle"
                            style={{
                                width: '12px',
                                height: '12px',
                                bottom: '2px',
                                right: '2px'
                            }}
                        ></span>
                    )}
                </span>
            </div>
            <div className="d-flex flex-column" style={{cursor: 'pointer'}} onClick={handleShow}>
                <div className='fs-4'>{`${selectedUser.firstName} ${selectedUser.lastName}`}</div>
                <div className={`fs-6 font-light text-start ${isUserOnline ? 'text-light' : 'text-muted'}`}>
                    {isUserOnline ? (
                        <>
                            <span className="text-light">● Online</span>
                        </>
                    ) : (
                        <span className="text-muted">○ Offline</span>
                    )}
                </div>
            </div>
        </div>
        <Button variant="primary" onClick={handleShow}>
            See Profile
        </Button>

        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <h4>{`${selectedUser.firstName} ${selectedUser.lastName}`}</h4>
            </Modal.Header>
            <Modal.Body>
                <div className="d-flex flex-column gap-3">
                    <div>
                        <strong>Email:</strong>
                        <p className="mb-0">{selectedUser.email}</p>
                    </div>
                    <div>
                        <strong>Status:</strong>
                        <p className={`mb-0 ${isUserOnline ? 'text-success' : 'text-muted'}`}>
                            {isUserOnline ? '🟢 Online' : '🔴 Offline'}
                        </p>
                    </div>
                    <div>
                        <strong>Full Name:</strong>
                        <p className="mb-0">{`${selectedUser.firstName} ${selectedUser.lastName}`}</p>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Close</Button>
            </Modal.Footer>
        </Modal>
    </div>
  )
}

export default Header